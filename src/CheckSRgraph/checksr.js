const { default: axios } = require("../../node_modules/axios");
const { Beatmap, Calculator } = require("../../node_modules/rosu-pp");
const fs = require("fs")

module.exports.srchart = async (beatmapId, mode) => {
    const beatmapdata = await axios(`https://osu.ppy.sh/osu/${beatmapId}`,{responseType: "arrayBuffer",});
    fs.writeFileSync(`./BeatmapFolder/${beatmapId}.osu`, beatmapdata.data)
    let hitObjectsFlag = false;
    let mapdata = "";
    let srdata = [];
    let sr = 0;
    const beatmapdatastream = fs.createReadStream(`./BeatmapFolder/${beatmapId}.osu`);
    const lineReader = require('readline').createInterface({
        input: beatmapdatastream
    });
    lineReader.on('line', (line) =>
        {
            if (!hitObjectsFlag) {
                mapdata += line + "\n";
            }
            if (line.indexOf('[HitObjects]') !== -1) {
                hitObjectsFlag = true
                mapdata += line + "\n";
            }
            if (hitObjectsFlag) {
                hitObjectsFlag = true
                mapdata += line + "\n";
                sr = calculateStarRating(new TextEncoder().encode(mapdata) , 0, mode)
                srdata.push(sr);
            }
        }
    )

    lineReader.on('close', () =>
        {
            const baseURL = 'https://image-charts.com/chart.js/2.8.0';
            generateChartImage();
            async function generateChartImage() {
                const dividedsrdata = divideInto100Parts(srdata);
                console.log(dividedsrdata)
                const srdatalengtharray = labelarray(dividedsrdata.length);
                const chartConfig = {
                    type: "line",
                    data: {
                        datasets: [
                            {
                                data: dividedsrdata,
                                label: "SRdata",
                                borderColor: "rgb(255, 255, 255)",
                                backgroundColor: "rgba(54, 162, 235, 0.5)",
                                fill: 'start'
                            }
                        ],
                        labels: srdatalengtharray,
                    },
                }

                const requestURL = `${baseURL}?bkg=white&c=${JSON.stringify(chartConfig)}`;

                try {
                    // 画像を取得して保存
                    const response = await axios.get(requestURL, { responseType: 'arraybuffer' });
                    fs.writeFileSync(`./BeatmapFolder/${beatmapId}.png`, response.data);
                } catch (error) {
                    console.error('Error generating chart image:', error)
                }
            }
        }
    )
}

function calculateStarRating (beatmap, mods, mode) {
	let map = new Beatmap({ bytes: beatmap });
	let score = {
		mode: mode,
		mods: mods,
	};
	let calc = new Calculator(score);
	let Calculated = calc.performance(map);
	return parseFloat(Calculated.difficulty.stars.toFixed(2))
}

function divideInto100Parts(data) {
    const result = [];
    const length = data.length;
    const step = Math.floor(length / 100);
    for (let i = 0; i < length; i += step) {
        result.push(data[i])
    }
    return result
}

function labelarray(count) {
    const countarray = new Array(count);
    countarray.fill(".");
    const countstep = count / 4;
    const countsteparray = [0, Math.round(countstep - 1), Math.round(countstep * 2 - 1), Math.round(countstep * 3 - 1), count - 1]
    for (let i = 0; i < countsteparray.length; i++) {
        if (i == 0) {
            countarray[countsteparray[i]] = 0
        } else if (i == 1){
            countarray[countsteparray[i]] = 25
        } else if (i == 2){
            countarray[countsteparray[i]] = 50
        } else if (i == 3){
            countarray[countsteparray[i]] = 75
        } else if (i == 4){
            countarray[countsteparray[i]] = 100
        }
    }
    return countarray
}
