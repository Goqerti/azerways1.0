// controllers/musicController.js
const play = require('play-dl');

exports.playSong = async (req, res) => {
    const songName = req.query.song;
    console.log(`[Music] Axtarış başladı: "${songName}"`);

    if (!songName) {
        return res.status(400).send('Mahnı adı daxil edilməyib.');
    }

    try {
        // play-dl ilə YouTube-da axtarış edirik
        const searchResults = await play.search(songName, {
            limit: 1, // Yalnız 1 nəticə tapmaq kifayətdir
            source: { youtube : 'video' } // Yalnız videoları axtar
        });

        if (!searchResults.length) {
            console.error(`[Music] Mahnı tapılmadı: "${songName}"`);
            return res.status(404).send('Bu adla mahnı tapılmadı.');
        }

        const video = searchResults[0];
        console.log(`[Music] Video tapıldı: "${video.title}"`);

        // Səs axınını (stream) alırıq
        const stream = await play.stream(video.url);

        // Səs axınını birbaşa istifadəçiyə göndəririk
        res.writeHead(200, {
            'Content-Type': stream.type,
            'Content-Length': stream.size
        });

        stream.stream.pipe(res);

    } catch (error) {
        console.error('[Music] Mahnını emal edərkən detallı xəta:', error);
        res.status(500).send('Mahnı yayımlanarkən daxili xəta baş verdi.');
    }
};