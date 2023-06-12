const { default: axios } = require("axios");
const fs = require("fs")

module.exports.getOsuBeatmapFile = async (beatmapId) => {
    await axios(`https://osu.ppy.sh/osu/${beatmapId}`, {
		responseType: "arrayBuffer",
		}
    ).then((response) => {
        const buffer = Buffer.from(response.data);
        fs.writeFileSync(`./BeatmapFolder/${beatmapId}.txt`, buffer);
        }
    );
};

module.exports.checkStream = (beatmapId, bpm) => {
        return new Promise((resolve) => {
            let hitObjectsFlag = false;
            let stream = 0;
            let maxStream = 0;
            let prevValue = null;
            const interval =  ((60 / bpm) * 1000 * 1/4) + 1;
            const streamData = fs.createReadStream(`./BeatmapFolder/${beatmapId}.txt`);
            const lineReader = require('readline').createInterface(
                {
                    input: streamData,
                }
            );
            lineReader.on('line', (line) => {
                    if (line.indexOf('[HitObjects]') !== -1) {
                        hitObjectsFlag = true;
                    };
                    if (hitObjectsFlag && line.split(',').length >= 3) {
                        const value = parseInt(line.split(',')[2]);
                        if (prevValue !== null && Math.abs(value - prevValue) <= interval) {
                            stream += 1;
                        }else {
                            if (stream > maxStream) {
                                maxStream = stream;
                            }
                            stream = 0;
                        }
                        prevValue = value;
                    };
                }
            );
            lineReader.on('close', () => {
                    if (stream > maxStream) {
                        maxStream = stream;
                    };
                    resolve(maxStream);
                }
            )
        }
    )
}
