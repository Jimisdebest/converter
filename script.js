const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API endpoint om video informatie op te halen
app.get('/api/video-info', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        const info = await ytdl.getInfo(url);
        
        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            channel: info.videoDetails.author.name,
            views: info.videoDetails.viewCount
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint om video te downloaden
app.get('/api/download', async (req, res) => {
    try {
        const { url, format, quality } = req.query;
        
        if (!url || !format) {
            return res.status(400).json({ error: 'URL and format are required' });
        }
        
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        const filename = `${title}.${format}`;
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        if (format === 'mp3') {
            // Download als MP3
            const audioStream = ytdl(url, { quality: 'highestaudio' });
            
            ffmpeg(audioStream)
                .audioBitrate(128)
                .format('mp3')
                .pipe(res, { end: true });
                
        } else if (format === 'mp4') {
            // Download als MP4
            let stream;
            
            if (quality === '1080') {
                // Voor 1080p moeten audio en video gecombineerd worden
                const video = ytdl(url, { quality: '137' }); // 1080p video
                const audio = ytdl(url, { quality: 'highestaudio' });
                
                ffmpeg()
                    .input(video)
                    .input(audio)
                    .format('mp4')
                    .pipe(res, { end: true });
                    
            } else {
                // Voor lagere kwaliteiten
                stream = ytdl(url, { quality: quality + 'p' });
                stream.pipe(res);
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});