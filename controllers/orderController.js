// controllers/orderController.js
const fileStore = require('../services/fileStore');
const telegram = require('../services/telegramService');

const calculateGelir = (order) => {
    const alishAmount = order.alish?.amount || 0;
    const satishAmount = order.satish?.amount || 0;
    if (order.alish?.currency === order.satish?.currency) {
        return { amount: parseFloat((satishAmount - alishAmount).toFixed(2)), currency: order.satish.currency };
    }
    return { amount: 0, currency: 'N/A', note: 'Fərqli valyutalar' };
};

exports.getAllOrders = (req, res) => {
    const orders = fileStore.getOrders();
    res.json(orders.map(o => ({ ...o, gelir: calculateGelir(o) })));
};

exports.createOrder = (req, res) => {
    try {
        const newOrderData = req.body;
        if (!newOrderData.turist) {
            return res.status(400).json({ message: 'Turist məlumatı mütləq daxil edilməlidir.' });
        }
        const orders = fileStore.getOrders();
        let nextSatisNo = 1695;
        if (orders.length > 0) {
            const maxSatisNo = Math.max(...orders.map(o => parseInt(o.satisNo)).filter(num => !isNaN(num)), 0);
            nextSatisNo = maxSatisNo >= 1695 ? maxSatisNo + 1 : 1695;
        }
        const orderToSave = {
            satisNo: String(nextSatisNo),
            creationTimestamp: new Date().toISOString(),
            createdBy: req.session.user.username,
            ...newOrderData,
            paymentStatus: newOrderData.paymentStatus || 'Ödənilməyib',
            paymentDueDate: newOrderData.paymentDueDate || null
        };
        orders.push(orderToSave);
        fileStore.saveAllOrders(orders);

        const actionMessage = `yeni sifariş (№${orderToSave.satisNo}) yaratdı: <b>${orderToSave.turist}</b>`;
        telegram.sendLog(telegram.formatLog(req.session.user, actionMessage));

        // Bütün sifarişlər arasından bu istifadəçinin yaratdıqlarını sayırıq
        const userOrdersCount = orders.filter(o => o.createdBy === req.session.user.username).length;
        const milestones = [10, 50, 100];
        let milestoneReached = null;

        if (milestones.includes(userOrdersCount)) {
            milestoneReached = { count: userOrdersCount };
        }
        
        // Cavaba "milestone" məlumatını əlavə edirik
        res.status(201).json({ 
            ...orderToSave, 
            gelir: calculateGelir(orderToSave), 
            milestone: milestoneReached // Əgər mərhələyə çatılıbsa, burada məlumat olacaq, yoxsa null olacaq
        });

    } catch (error) {
        res.status(500).json({ message: 'Serverdə daxili xəta baş verdi.' });
    }
};

exports.updateOrder = (req, res) => {
    const { role } = req.session.user;
    const permissions = fileStore.getPermissions();
    const userPermissions = permissions[role] || {};

    if (role !== 'owner' && !userPermissions.canEditOrder) {
        return res.status(403).json({ message: 'Sifarişi redaktə etməyə icazəniz yoxdur.' });
    }
    try {
        const { satisNo } = req.params;
        const updatedOrderData = req.body;
        let orders = fileStore.getOrders();
        const orderIndex = orders.findIndex(o => String(o.satisNo) === String(satisNo));
        if (orderIndex === -1) return res.status(404).json({ message: `Sifariş (${satisNo}) tapılmadı.` });

        const orderToUpdate = { ...orders[orderIndex] };
        const canEditFinancials = role === 'owner' || (userPermissions.canEditFinancials);

        if (!canEditFinancials) {
            delete updatedOrderData.alish;
            delete updatedOrderData.satish;
            delete updatedOrderData.detailedCosts;
        }

        Object.assign(orderToUpdate, updatedOrderData);
        orderToUpdate.satisNo = satisNo; // Ensure satisNo is not changed
        orders[orderIndex] = orderToUpdate;
        fileStore.saveAllOrders(orders);

        telegram.sendLog(telegram.formatLog(req.session.user, `sifarişə (№${satisNo}) düzəliş etdi.`));
        res.status(200).json({ message: 'Sifariş uğurla yeniləndi.'});
    } catch (error) {
        res.status(500).json({ message: 'Serverdə daxili xəta baş verdi.' });
    }
};

exports.deleteOrder = (req, res) => {
    const { role } = req.session.user;
    const permissions = fileStore.getPermissions();
    const userPermissions = permissions[role] || {};
    
    if (role !== 'owner' && !userPermissions.canDeleteOrder) {
        return res.status(403).json({ message: 'Bu əməliyyatı etməyə icazəniz yoxdur.' });
    }
    try {
        let orders = fileStore.getOrders();
        const orderToDelete = orders.find(o => String(o.satisNo) === req.params.satisNo);
        if (!orderToDelete) return res.status(404).json({ message: `Sifariş tapılmadı.` });
        
        const updatedOrders = orders.filter(order => String(order.satisNo) !== req.params.satisNo);
        fileStore.saveAllOrders(updatedOrders);

        telegram.sendLog(telegram.formatLog(req.session.user, `sifarişi (№${orderToDelete.satisNo}) sildi.`));
        res.status(200).json({ message: `Sifariş uğurla silindi.` });
    } catch (error) {
        res.status(500).json({ message: 'Sifariş silinərkən xəta.' });
    }
};

exports.updateOrderNote = (req, res) => {
    try {
        const { satisNo } = req.params;
        const { qeyd } = req.body;
        if (typeof qeyd === 'undefined') return res.status(400).json({ message: 'Qeyd mətni təqdim edilməyib.' });
        
        let orders = fileStore.getOrders();
        const orderIndex = orders.findIndex(o => String(o.satisNo) === String(satisNo));
        if (orderIndex === -1) return res.status(404).json({ message: `Sifariş (${satisNo}) tapılmadı.` });
        
        orders[orderIndex].qeyd = qeyd || '';
        fileStore.saveAllOrders(orders);
        res.status(200).json({ message: `Qeyd uğurla yeniləndi.` });
    } catch (error) {
        res.status(500).json({ message: 'Qeyd yenilənərkən daxili server xətası.' });
    }
};

exports.searchOrderByRezNo = (req, res) => {
    try {
        const { rezNomresi } = req.params;
        if (!rezNomresi?.trim()) return res.status(400).json({ message: 'Rezervasiya nömrəsi daxil edilməyib.' });
        
        const orders = fileStore.getOrders();
        const order = orders.find(o => String(o.rezNomresi).toLowerCase() === String(rezNomresi).toLowerCase());
        
        if (order) res.json({...order, gelir: calculateGelir(order)}); 
        else res.status(404).json({ message: `Bu rezervasiya nömrəsi ilə sifariş tapılmadı.` });
    } catch (error) {
        res.status(500).json({ message: 'Sifariş axtarılarkən daxili server xətası.' });
    }
};

exports.getReservations = (req, res) => {
    try {
        const orders = fileStore.getOrders();
        let allReservations = [];
        orders.forEach(order => {
            if (Array.isArray(order.hotels)) {
                order.hotels.forEach(hotel => {
                    if (hotel.otelAdi && hotel.girisTarixi && hotel.cixisTarixi) {
                        allReservations.push({
                            satisNo: order.satisNo,
                            turist: order.turist || '-',
                            otelAdi: hotel.otelAdi,
                            girisTarixi: hotel.girisTarixi,
                            cixisTarixi: hotel.cixisTarixi,
                            adultGuests: order.adultGuests || 0,
                            childGuests: order.childGuests || 0,
                        });
                    }
                });
            }
        });
        res.json(allReservations);
    } catch (error) {
        res.status(500).json({ message: 'Rezervasiyalar gətirilərkən xəta baş verdi.' });
    }
};

exports.getReports = (req, res) => {
    try {
        let orders = fileStore.getOrders();
        const report = {
            totalAlish: { AZN: 0, USD: 0, EUR: 0 },
            totalSatish: { AZN: 0, USD: 0, EUR: 0 },
            totalGelir: { AZN: 0, USD: 0, EUR: 0 },
            byHotel: {}
        };
        orders.forEach(order => {
            const gelir = calculateGelir(order);
            if (order.alish?.currency) report.totalAlish[order.alish.currency] += (order.alish.amount || 0);
            if (order.satish?.currency) report.totalSatish[order.satish.currency] += (order.satish.amount || 0);
            if (gelir?.currency && !gelir.note) report.totalGelir[gelir.currency] += (gelir.amount || 0);
            
            if (Array.isArray(order.hotels)) {
                order.hotels.forEach(hotel => {
                    const hotelName = hotel.otelAdi?.trim() || "Digər";
                    if (!report.byHotel[hotelName]) {
                        report.byHotel[hotelName] = { 
                            ordersCount: 0, 
                            alish: { AZN: 0, USD: 0, EUR: 0 }, 
                            satish: { AZN: 0, USD: 0, EUR: 0 }, 
                            gelir: { AZN: 0, USD: 0, EUR: 0 } 
                        };
                    }
                    report.byHotel[hotelName].ordersCount++;
                    if (order.alish?.currency) report.byHotel[hotelName].alish[order.alish.currency] += (order.alish.amount || 0);
                    if (order.satish?.currency) report.byHotel[hotelName].satish[order.satish.currency] += (order.satish.amount || 0);
                    if (gelir?.currency && !gelir.note) report.byHotel[hotelName].gelir[gelir.currency] += (gelir.amount || 0);
                });
            }
        });
        res.json(report);
    } catch (error) {
        res.status(500).json({ message: 'Hesabat hazırlanarkən serverdə xəta.', details: error.message });
    }
};

exports.getDebts = (req, res) => {
    try {
        const allOrders = fileStore.getOrders();
        let debts = allOrders.filter(order => 
            order.xariciSirket && (!order.paymentStatus || order.paymentStatus === 'Ödənilməyib')
        );

        if (req.query.company) {
            debts = debts.filter(d =>
                d.xariciSirket.toLowerCase().includes(req.query.company.toLowerCase())
            );
        }
        res.json(debts);
    } catch (error) {
        res.status(500).json({ message: 'Borclar siyahısı gətirilərkən xəta baş verdi.' });
    }
};

exports.getNotifications = (req, res) => {
    try {
        const orders = fileStore.getOrders();
        const notifications = [];
        const todayUTC = new Date();
        todayUTC.setUTCHours(0, 0, 0, 0);

        const threeDaysFromNowUTC = new Date(todayUTC);
        threeDaysFromNowUTC.setUTCDate(todayUTC.getUTCDate() + 3);

        orders.forEach(order => {
            if (!Array.isArray(order.hotels) || order.hotels.length === 0) return;

            order.hotels.forEach(hotel => {
                if (!hotel.girisTarixi) return;
                
                const checkInDate = new Date(hotel.girisTarixi);

                if (checkInDate >= todayUTC && checkInDate <= threeDaysFromNowUTC) {
                    const problemMessages = [];
                    if (!hotel.otelAdi || !hotel.cixisTarixi) problemMessages.push("Otel məlumatları natamamdır");
                    if (!order.transport || !order.transport.surucuMelumatlari) problemMessages.push("Transport məlumatı yoxdur");
                    
                    if (problemMessages.length > 0) {
                         notifications.push({
                            satisNo: order.satisNo,
                            turist: order.turist,
                            girisTarixi: checkInDate.toLocaleDateString('az-AZ', { timeZone: 'UTC' }),
                            problem: problemMessages.join('. ') + '.'
                        });
                    }
                }
            });
        });
        res.json(notifications);
    } catch (error) {
        console.error("Bildirişləri gətirərkən xəta:", error);
        res.status(500).json({ message: "Bildirişləri gətirmək mümkün olmadı." });
    }
};