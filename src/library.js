const axios = require("../node_modules/axios");
const { Beatmap, Calculator } = require("../node_modules/rosu-pp");

class User {
    constructor(name, apikey, mode, endpoint) {
        this.name = name;
        this.apikey = apikey;
        this.mode = mode;
        this.endpoint = endpoint;
    }

    getData() {
        return new Promise(async (resolve, reject) => {
            await axios.get(`https://osu.ppy.sh/api/${this.endpoint}?&k=${this.apikey}&type=string&m=${this.mode}&u=${this.name}`)
                .then(res => {
                    resolve(res.data[0]);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    getDataWithoutMode() {
        return new Promise(async (resolve, reject) => {
            await axios.get(`https://osu.ppy.sh/api/${this.endpoint}?&k=${this.apikey}&type=string&u=${this.name}`)
                .then(res => {
                    resolve(res.data[0]);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    getScoreData(beatmapId, mods = 0) {
        return new Promise(async (resolve, reject) => {
            await axios.get(`https://osu.ppy.sh/api/${this.endpoint}?&k=${this.apikey}&b=${beatmapId}&type=string&m=${this.mode}&u=${this.name}&mods=${mods}`)
                .then(res => {
                    let maxPP = 0;
                    let maxPPIndex = 0;
                    for (let i = 0; i < res.data.length; i++) {
                        if (res.data[i].pp > maxPP) {
                            maxPP = res.data[i].pp;
                            maxPPIndex = i;
                        }
                    }
                    resolve(res.data[maxPPIndex]);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    getScoreDataWithoutMods(beatmapId) {
        return new Promise(async (resolve, reject) => {
            await axios.get(`https://osu.ppy.sh/api/${this.endpoint}?&k=${this.apikey}&b=${beatmapId}&type=string&m=${this.mode}&u=${this.name}`)
            .then(res => {
                resolve(res.data);
            })
            .catch(error => {
                reject(error);
            });
        });
    }
}

class GetUserData extends User {
    constructor(name, apikey, mode = 0) {
        super(name, apikey, mode, 'get_user');
    }
}

class GetUserRecent extends User {
    constructor(name, apikey, mode = 0) {
        super(name, apikey, mode, 'get_user_recent');
    }
}

class GetUserScore extends User {
    constructor(name, apikey, mode = 0) {
        super(name, apikey, mode, 'get_scores');
    }
}

class GetMapData {
    constructor(maplink, apikey, mode = 0) {
        this.maplink = /^\d+$/.test(maplink) ? maplink : maplink.split("/")[5];
        this.apikey = apikey;
        this.mode = mode;
    }

    getData() {
        return new Promise(async (resolve, reject) => {
            await axios.get(`https://osu.ppy.sh/api/get_beatmaps?k=${this.apikey}&m=${this.mode}&b=${this.maplink}&a=1`)
            .then(res => {
                if (res.data.length === 0) {
                    reject(new Error("No data found"));
                }
                resolve(res.data[0]);
            })
            .catch(error => {
                reject(error);
            });
        });
    }

    getDataWithoutMode() {
        return new Promise(async (resolve, reject) => {
            await axios.get(`https://osu.ppy.sh/api/get_beatmaps?k=${this.apikey}&b=${this.maplink}`)
            .then(res => {
                if (res.data.length === 0) {
                    reject(new Error("No data found"));
                }
                resolve(res.data[0]);
            })
            .catch(error => {
                reject(error);
            });
        });
    }
}

class CalculatePPSR {
    constructor(maplink, mods = 0, mode = 0) {
        this.maplink = /^\d+$/.test(maplink) ? maplink : maplink.split("/")[5];
        this.beatmapData = null;
        this.mods = mods;
        this.mode = mode;
        this.acc = 100;
    }

    async getMapData() {
        return new Promise(async (resolve, reject) => {
            this.beatmapdata = await axios(`https://osu.ppy.sh/osu/${this.maplink}`, { responseType: "arrayBuffer" })
            .then(res => {
                this.beatmapData = res.data;
                resolve();
            })
            .catch(error => {
                reject(error);
            })
        });
    }

    async getMap () {
        if (this.beatmapData === null) {
            await this.getMapData()
            .catch(error => {
                reject(error);
            });
        }
        return this.beatmapData;
    }

    async calcObject () {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.beatmapData === null) {
                    await this.getMapData()
                    .catch(error => {
                        reject(error);
                    });
                }
                const map = new Beatmap({ bytes: new Uint8Array(Buffer.from(this.beatmapData)) });
                const score = {
                    mode: this.mode
                };
                switch (this.mode) {
                    case 0:
                    case 2:
                        return resolve(new Calculator(score).performance(map).difficulty);
        
                    case 1:
                    case 3:
                        return resolve(new Calculator(score).mapAttributes(map));
                }
            } catch (error) {
                reject(error);
            }
        })
    }

    acc (num) {
        this.acc = num;
        return this;
    }

    mods (num) {
        this.mods = num;
        return this;
    }

    calculateSR() {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.beatmapData === null) {
                    await this.getMapData()
                    .catch(error => {
                        reject(error);
                    });
                }

                const map = new Beatmap({ bytes: new Uint8Array(Buffer.from(this.beatmapData)) });
                const score = {
                    mode: this.mode,
                    mods: this.mods
                };

                const SR = new Calculator(score).performance(map).difficulty.stars;
                const PP = new Calculator(score).acc(this.acc).performance(map).pp;

                const param = {
                    sr: SR,
                    pp: PP
                };

                resolve(param);
            } catch (error) {
                reject(error);
            }
        });
    }

    calculateDT() {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.beatmapData === null) {
                    await this.getMapData()
                    .catch(error => {
                        reject(error);
                    });
                }
    
                const map = new Beatmap({ bytes: new Uint8Array(Buffer.from(this.beatmapData)) });
                const score = {
                    mode: this.mode,
                    mods: 64
                };
    
                const SR = new Calculator(score).performance(map).difficulty.stars;
                const PP = new Calculator(score).performance(map).pp;

                const param = {
                    sr: SR,
                    pp: PP
                };

                resolve(param);
            } catch (error) {
                reject(error);
            }
        });
    }

    calculateScorePP(params) {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.beatmapData === null) {
                    await this.getMapData()
                        .catch(error => {
                            reject(error);
                        });
                }
    
                const map = new Beatmap({ bytes: new Uint8Array(Buffer.from(this.beatmapData)) });
                const PP = new Calculator(params).performance(map).pp;

                resolve(PP);
            } catch (error) {
                reject(error);
            }
        });
    }
}

class CheckMapData {
    constructor(maplink) {
        this.maplink = maplink;
        this.beatmapID = this.maplink.split("/")[5];
    }

    check() {
        return new Promise(async (resolve, reject) => {
            try {
                const mapdata = await axios.get(`https://osu.ppy.sh/osu/${this.beatmapID}`, { responseType: "stream" });
                const lineReader = require('readline').createInterface({
                    input: mapdata.data
                });
                let BPMarray = [];
                let prevValue = null;
                let currentBPM = 0;
                let stream = 0;
                let eightStream = 0;
                let sixStream = 0;
                let threeStream = 0;
                let timingpointflag = false;
                let hitobjects = false;
                let lastEight = false;
                let lastSix = false;
                let lastThree = false;
                let lastStream = false;
                let isTechStream = false;
                let tempTechStream = 0;
                let streamArray = [];
                let techStreamArray = [];
                let mapData = {
                    "BPMarray": [],
                    "maxStream": 0,
                    "streamCount": 0,
                    "over100ComboAverageStreamLength": 0,
                    "techStream" : 0,
                    "techStreamCount": 0,
                    "over100ComboAverageTechStreamLength": 0,
                    "1/3 times": 0,
                    "max1/3Length": 0,
                    "1/4 times": 0,
                    "max1/4Length": 0,
                    "1/6 times": 0,
                    "max1/6Length": 0,
                    "1/8 times": 0,
                    "max1/8Length": 0
                };

                lineReader.on('line', (line) => {
                    if (timingpointflag) {
                        const timingpoint = line.split(",");
                        if (timingpoint[6] == 1) {
                            const BPM = 1 / Number(line.split(",")[1]) * 60000;
                            BPMarray.push([Number(timingpoint[2]), BPM]);
                            mapData.BPMarray.push(BPM);
                        }
                    }
    
                    if (hitobjects) {
                        const timing = Number(line.split(",")[2]);
                        for (const element of BPMarray) {
                            if (element && timing >= element[0] && timing < element[0]) {
                                currentBPM = element[1];
                                break;
                            }
                        }

                        for (let i = 0; i < BPMarray.length; i++) {
                            if (!BPMarray[i + 1]) {
                                currentBPM = BPMarray[i][1];
                                break;
                            }

                            if (BPMarray[i] && timing >= BPMarray[i][0] && timing < BPMarray[i + 1][0]) {
                                currentBPM = BPMarray[i][1];
                            }
                        }

                        let eightInterval = (( 60 / currentBPM ) * 1000 * 1 / 8) + 1;
                        let sixInterval = (( 60 / currentBPM ) * 1000 * 1 / 6) + 1;
                        let fourInterval = (( 60 / currentBPM ) * 1000 * 1 / 4) + 1;
                        let threeInterval = (( 60 / currentBPM ) * 1000 * 1 / 3) + 1;
                        const value = Number(line.split(',')[2]);

                        if (prevValue !== null && Math.abs(value - prevValue) <= eightInterval) {
                            if (!lastEight) eightStream = 1;
                            if ((lastSix || lastStream || lastThree) && !isTechStream) {
                                isTechStream = true;
                                tempTechStream = 1;
                            }

                            if (isTechStream) tempTechStream++;

                            if (tempTechStream > 30 && tempTechStream > mapData["techStream"] && isTechStream) {
                                mapData["techStream"] = tempTechStream;
                            }

                            if (lastSix) mapData["1/6 times"]++;
                            if (sixStream > mapData["max1/6Length"]) {
                                mapData["max1/6Length"] = sixStream + 1;
                            }
                            lastSix = false;
                            sixStream = 0;
                            
                            if (lastStream && stream >= 100) {
                                mapData["streamCount"]++;
                                if (stream > mapData["maxStream"]) {
                                    mapData["maxStream"] = stream + 1;
                                }
                            } else {
                                mapData["1/4 times"]++;
                            }
                            if (stream > mapData["max1/4Length"]) {
                                mapData["max1/4Length"] = stream + 1;
                            }
                            if (stream >= 100) streamArray.push(stream);
                            lastStream = false;
                            stream = 0;

                            if (lastThree) mapData["1/3 times"]++;
                            if (threeStream > mapData["max1/3Length"]) {
                                mapData["max1/3Length"] = threeStream + 1;
                            }
                            lastThree = false;
                            threeStream = 0;

                            lastEight = true;
                            eightStream++;
                            if (eightStream > mapData["max1/8Length"]) {
                                mapData["max1/8Length"] = eightStream;
                            }
                        } else if (prevValue !== null && Math.abs(value - prevValue) <= sixInterval) {
                            if (!lastSix) sixStream = 1;
                            if ((lastEight || lastStream || lastThree) && !isTechStream) {
                                isTechStream = true;
                                tempTechStream = 1;
                            }

                            if (isTechStream) tempTechStream++;

                            if (tempTechStream > 30 && tempTechStream > mapData["techStream"] && isTechStream) {
                                mapData["techStream"] = tempTechStream;
                            }

                            if (lastEight) mapData["1/8 times"]++;
                            if (eightStream > mapData["max1/8Length"]) {
                                mapData["max1/8Length"] = eightStream + 1;
                            }
                            lastEight = false;
                            eightStream = 0;
                            
                            if (lastStream && stream >= 100) {
                                mapData["streamCount"]++;
                                if (stream > mapData["maxStream"]) {
                                    mapData["maxStream"] = stream + 1;
                                }
                            } else {
                                mapData["1/4 times"]++;
                            }
                            if (stream > mapData["max1/4Length"]) {
                                mapData["max1/4Length"] = stream + 1;
                            }
                            if (stream >= 100) streamArray.push(stream);
                            lastStream = false;
                            stream = 0;

                            if (lastThree) mapData["1/3 times"]++;
                            if (threeStream > mapData["max1/3Length"]) {
                                mapData["max1/3Length"] = threeStream + 1;
                            }
                            lastThree = false;
                            threeStream = 0;

                            lastSix = true;
                            sixStream++;
                            if (sixStream > mapData["max1/6Length"]) {
                                mapData["max1/6Length"] = sixStream;
                            }
                        } else if (prevValue !== null && Math.abs(value - prevValue) <= fourInterval) {
                            if (!lastStream) stream = 1;
                            if ((lastEight || lastSix || lastThree) && !isTechStream) {
                                isTechStream = true;
                                tempTechStream = 1;
                            }

                            if (isTechStream) tempTechStream++;

                            if (tempTechStream > 30 && tempTechStream > mapData["techStream"] && isTechStream) {
                                mapData["techStream"] = tempTechStream;
                            }

                            if (lastEight) mapData["1/8 times"]++;
                            if (eightStream > mapData["max1/8Length"]) {
                                mapData["max1/8Length"] = eightStream + 1;
                            }
                            lastEight = false;
                            eightStream = 0;
                            
                            if (lastSix) mapData["1/6 times"]++;
                            if (sixStream > mapData["max1/6Length"]) {
                                mapData["max1/6Length"] = sixStream + 1;
                            }
                            lastSix = false;
                            sixStream = 0;

                            if (lastThree) mapData["1/3 times"]++;
                            if (threeStream > mapData["max1/3Length"]) {
                                mapData["max1/3Length"] = threeStream + 1;
                            }
                            lastThree = false;
                            threeStream = 0;

                            lastStream = true;
                            stream++;
                            if (stream > mapData["max1/4Length"]) {
                                mapData["max1/4Length"] = stream;
                            }
                        } else if (prevValue !== null && Math.abs(value - prevValue) <= threeInterval) {
                            if (!lastThree) threeStream = 1;
                            if ((lastEight || lastSix || lastStream) && !isTechStream) {
                                isTechStream = true;
                                tempTechStream = 1;
                            }

                            if (isTechStream) tempTechStream++;

                            if (tempTechStream > 30 && tempTechStream > mapData["techStream"] && isTechStream) {
                                mapData["techStream"] = tempTechStream;
                            }

                            if (lastEight) mapData["1/8 times"]++;
                            if (eightStream > mapData["max1/8Length"]) {
                                mapData["max1/8Length"] = eightStream + 1;
                            }
                            lastEight = false;
                            eightStream = 0;

                            if (lastSix) mapData["1/6 times"]++;
                            if (sixStream > mapData["max1/6Length"]) {
                                mapData["max1/6Length"] = sixStream + 1;
                            }
                            lastSix = false;
                            sixStream = 0;
                            
                            if (lastStream && stream >= 100) {
                                mapData["streamCount"]++;
                                if (stream > mapData["maxStream"]) {
                                    mapData["maxStream"] = stream + 1;
                                }
                            } else {
                                mapData["1/4 times"]++;
                            }
                            if (stream > mapData["max1/4Length"]) {
                                mapData["max1/4Length"] = stream + 1;
                            }
                            if (stream >= 100) streamArray.push(stream);
                            lastStream = false;
                            stream = 0;

                            lastThree = true;
                            threeStream++;
                            if (threeStream > mapData["max1/3Length"]) {
                                mapData["max1/3Length"] = threeStream;
                            }
                        } else {
                            if (isTechStream && tempTechStream > 30) {
                                mapData["techStreamCount"]++;
                                techStreamArray.push(tempTechStream);
                            }
                            isTechStream = false;
                            tempTechStream = 0;
                            if (lastEight) mapData["1/8 times"]++;
                            if (eightStream > mapData["max1/8Length"]) {
                                mapData["max1/8Length"] = eightStream + 1;
                            }
                            lastEight = false;
                            eightStream = 0;
                            
                            if (lastSix) mapData["1/6 times"]++;
                            if (sixStream > mapData["max1/6Length"]) {
                                mapData["max1/6Length"] = sixStream + 1;
                            }
                            lastSix = false;
                            sixStream = 0;

                            if (lastThree) mapData["1/3 times"]++;
                            if (threeStream > mapData["max1/3Length"]) {
                                mapData["max1/3Length"] = threeStream + 1;
                            }
                            lastThree = false;
                            threeStream = 0;
                            
                            if (lastStream && stream >= 100) {
                                mapData["streamCount"]++;
                                if (stream > mapData["maxStream"]) {
                                    mapData["maxStream"] = stream + 1;
                                }
                            } else {
                                mapData["1/4 times"]++;
                            }
                            if (stream > mapData["max1/4Length"]) {
                                mapData["max1/4Length"] = stream + 1;
                            }
                            if (stream >= 100) streamArray.push(stream);
                            lastStream = false;
                            stream = 0;
                        }
                        prevValue = value;
                    }
    
                    if (line.startsWith("[HitObjects]")) {
                        timingpointflag = false;
                        hitobjects = true;
                    }

                    if (line.startsWith("[Colors]")) {
                        timingpointflag = false;
                    }
    
                    if (line.startsWith("[TimingPoints]")) {
                        timingpointflag = true;
                    }
                });
    
                lineReader.on('close', () => {
                    if (isTechStream && tempTechStream > 30) {
                        mapData["techStreamCount"]++;
                    }

                    if (lastEight) mapData["1/8 times"]++;
                    if (eightStream > mapData["max1/8Length"]) {
                        mapData["max1/8Length"] = eightStream + 1;
                    }
                    
                    if (lastSix) mapData["1/6 times"]++;
                    if (sixStream > mapData["max1/6Length"]) {
                        mapData["max1/6Length"] = sixStream + 1;
                    }

                    if (lastThree) mapData["1/3 times"]++;
                    if (threeStream > mapData["max1/3Length"]) {
                        mapData["max1/3Length"] = threeStream + 1;
                    }
                    
                    if (lastStream && stream >= 100) {
                        mapData["streamCount"]++;
                        if (stream > mapData["maxStream"]) {
                            mapData["maxStream"] = stream + 1;
                        }
                    } else {
                        mapData["1/4 times"]++;
                    }
                    if (stream > mapData["max1/4Length"]) {
                        mapData["max1/4Length"] = stream + 1;
                    }
                    if (stream >= 100) streamArray.push(stream);

                    lastEight = false;
                    lastSix = false;
                    lastStream = false;
                    lastThree = false;
                    isTechStream = false;
                    eightStream = 0;
                    sixStream = 0;
                    stream = 0;
                    threeStream = 0;
                    tempTechStream = 0;
                    mapData["over100ComboAverageStreamLength"] = streamArray.length == 0 ? 0 : streamArray.reduce((acc, cur) => acc + cur, 0) / streamArray.length;
                    mapData["over100ComboAverageTechStreamLength"] = techStreamArray.length == 0 ? 0 : techStreamArray.reduce((acc, cur) => acc + cur, 0) / techStreamArray.length;
                    resolve(mapData);
                })

                lineReader.on('error', (error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        })
    }
}

const ModStrings = {
	0: "NM",
	1: "NF",
	2: "EZ",
	8: "HD",
	16: "HR",
	32: "SD",
	64: "DT",
	128: "RX",
	256: "HT",
	512: "NC",
	1024: "FL",
	2048: "Autoplay",
	8192: "Relax2",
	16384: "PF",
};

const ModtoStrings = {
	"NM": 0,
	"NF": 1,
	"EZ": 2,
	"HD": 8,
	"HR": 16,
	"SD": 32,
	"DT": 64,
	"RX": 128,
	"HT": 256,
	"NC": 512,
	"FL": 1024,
	"Autoplay": 2048,
	"Relax2": 8192,
	"PF": 16384,
};

class Mod {
    constructor(mods) {
        this.mods = mods;
    }

    /**
     * Retrieves the mods information.
     * @returns {Object} The mods information object.
     */
    get() {
        // modをチェックする
        if (!this.mods) {
            return {
                "array": ["NM"],
                "str": "NM",
                "num": 0,
                "calc": 0
            };
        } else {
            this.mods = this.mods.toUpperCase();
        }

        if (/^\d+$/.test(this.mods)) {
            this.mods = Number(this.mods);
            let activeMods = [];
            for (let i = 0; i < 14; i++) {
                const bit = 1 << i;
                if ((this.mods & bit) === bit) {
                    activeMods.push(ModStrings[bit])
                }
            }
            if (activeMods.includes("DT") && activeMods.includes("NC")) activeMods = activeMods.filter(mod => mod !== "DT");

            let num = 0;
            num = activeMods.reduce((acc, modString) =>{
                let modValue = ModtoStrings[modString];
                if (modString == "NC") modValue = 576;
                if (modString == "PF") modValue = 16416;
                if (modValue) return acc | modValue;
                return acc;
            }, 0);

            let calc = 0;
            let modsForCalc = activeMods;
            if (activeMods.includes("NC")) {
                modsForCalc = modsForCalc.filter(mod => mod !== "NC");
                modsForCalc.push("DT");
            }
            calc = modsForCalc.reduce((acc, modString) =>{
                const modValue = ModtoStrings[modString];
                if (modValue) return acc | modValue;
                return acc;
            }, 0);

            return {
                "array": activeMods.length == 0 ? ["NM"] : activeMods,
                "str": activeMods == "" ? "NM" : activeMods.join(""),
                "num": !num ? 0 : num,
                "calc": !calc ? 0 : calc
            };
        } else {
            let activeMods = this.mods.match(/.{2}/g);
            const checkArray = ['NM', 'EZ', 'HT', 'NF', 'HR', 'HD', 'SD', 'DT', 'NC', 'FL', 'SO', 'PF', 'V2', 'TD', 'HD', 'FI', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9'];
            for (const element of activeMods) {
                if (!checkArray.includes(element)) return false;
            }
            if (activeMods.includes("NC") && activeMods.includes("HT") || activeMods.includes("DT") && activeMods.includes("HT") || activeMods.includes("DT") && activeMods.includes("NC") || activeMods.includes("EZ") && activeMods.includes("HR")) return false;
            const checkMods = activeMods.some(mod => mod.length != 2);
            if (checkMods) return false;
            activeMods = activeMods.map(mod => mod.toUpperCase());
            if (activeMods.includes("DT") && activeMods.includes("NC")) activeMods = activeMods.filter(mod => mod !== "DT");

            let num = 0;
            num = activeMods.reduce((acc, modString) =>{
                let modValue = ModtoStrings[modString];
                if (modString == "NC") modValue = 576;
                if (modString == "PF") modValue = 16416;
                if (modValue) return acc | modValue;
                return acc;
            }, 0);

            let calc = 0;
            let modsForCalc = activeMods;
            if (activeMods.includes("NC")) {
                modsForCalc = modsForCalc.filter(mod => mod !== "NC");
                modsForCalc.push("DT");
            }
            calc = modsForCalc.reduce((acc, modString) =>{
                const modValue = ModtoStrings[modString];
                if (modValue) return acc | modValue;
                return acc;
            }, 0);

            return {
                "array": activeMods.length == 0 ? ["NM"] : activeMods,
                "str": activeMods == "" ? "NM" : activeMods.join(""),
                "num": !num ? 0 : num,
                "calc": !calc ? 0 : calc
            };
        }
    }
}

class URLBuilder {

    /**
     *
     * @param {*} userId
     * @returns icon URL
     */
    static iconURL(userId) {
        if (!userId) return "https://a.ppy.sh/2";
        return `https://a.ppy.sh/${userId}`;
    }

    /**
     *
     * @param {*} beatmapSetId
     * @param {*} mode: 0 = osu!, 1 = taiko, 2 = fruits, 3 = mania
     * @param {*} beatmapId
     * @returns beatmap URL
     */
    static beatmapURL(beatmapSetId, mode, beatmapId) {
        return `https://osu.ppy.sh/beatmapsets/${beatmapSetId}#${modeconvertforlinks(mode)}/${beatmapId}`;
    }

    /**
     *
     * @param {*} userId
     * @returns user URL
     */
    static userURL(userId) {
        if (!userId) return "https://osu.ppy.sh/home";
        return `https://osu.ppy.sh/users/${userId}`;
    }

    /**
     *
     * @param {*} beatmapSetId or beatmap Link
     * @returns background URL
     */
    static backgroundURL(beatmapSetId) {
        beatmapSetId = /^\d+$/.test(beatmapSetId) ? beatmapSetId : beatmapSetId.split("/")[4].split("#")[0];
        return `https://assets.ppy.sh/beatmaps/${beatmapSetId}/covers/cover.jpg`;
    }

    /**
     *
     * @param {*} beatmapSetId
     * @returns thumbnail URL
     */
    static thumbnailURL(beatmapSetId) {
        return `https://b.ppy.sh/thumb/${beatmapSetId}l.jpg`;
    }
}

class Tools {
    static mapstatus(approved) {
        switch (Number(approved)) {
            case -2:
                return "Graveyard";
            case -1:
                return "WIP";
            case 0:
                return "Pending";
            case 1:
                return "Ranked";
            case 2:
                return "Approved";
            case 3:
                return "Qualified";
            case 4:
                return "Loved";
            default:
                return "Unknown";
        }
    }
}

class CalculateGlobalPP {
    static calculate(scores, userplaycount) {
        let scorepp = 0.0;
        for (let i = 0; i < scores.length; i++) {
            scorepp += scores[i] * Math.pow(0.95, i);
        }
        return scorepp + extraPolatePPRemainder(scores, userplaycount);
    }
}

class SRChart {
    static async calculate(beatmapId, mode) {
        return new Promise(async (resolve, reject) => {
            try {
                const beatmapdata = await axios(`https://osu.ppy.sh/osu/${beatmapId}`, { responseType: "arrayBuffer" })
                    .then(response => response.data );
                const map = new Beatmap({ bytes: Buffer.from(beatmapdata) });
                const objectCount = calculateObject(map, mode);
    
                if (objectCount > 10000) {
                    reject(new Error("オブジェクト数が多すぎます。"));
                } else {
                    const baseURL = 'https://image-charts.com/chart.js/2.8.0';
                    const srdata = await calculateStarRating(map, mode, objectCount);
                    const dividedsrdata = divideInto100Parts(srdata);
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
                        }
                    };
                    const requestURL = `${baseURL}?bkg=white&c=${JSON.stringify(chartConfig)}`;
                    const response = await axios.get(requestURL, { responseType: 'arraybuffer' })
                        .then(response => { return response.data; });
                    resolve(response);
                }
            } catch (error) {
                reject(error);
            }
        })
    }
}

function extraPolatePPRemainder(scores, userplaycount) {
    if (scores.length < 100) {
        return 0.0;
    }

    let ys = scores;
    for (let i = 0; i < ys.length; i++) {
        ys[i] = Math.log10(scores[i] * Math.pow(0.95, i)) / Math.log10(100);
    }

    let b = calculateLinearRegression(ys);
    let pp = 0.0;
    for (let n = 100; n <= userplaycount; n++) {
        let val = Math.pow(100.0, b[0] + b[1] * n);
        if (val <= 0.0) break;
        pp += val;
    }

    return pp;
}

function calculateLinearRegression(ys) {
    let sumOxy = 0.0;
    let sumOx2 = 0.0;
    let avgX = 0.0;
    let avgY = 0.0;
    let sumX = 0.0;
    for (let n = 1; n <= ys.length; n++) {
        let weight = Math.log1p(n + 1.0);
        sumX += weight;
        avgX += n * weight;
        avgY += ys[n - 1] * weight;
    }

    avgX /= sumX;
    avgY /= sumX;

    for (let n = 1; n <= ys.length; n++) {
        sumOxy += (n - avgX) * (ys[n - 1] - avgY) * Math.log1p(n + 1.0);
        sumOx2 += Math.pow(n - avgX, 2.0) * Math.log1p(n + 1.0);
    }

    let Oxy = sumOxy / sumX;
    let Ox2 = sumOx2 / sumX;

    return [avgY - (Oxy / Ox2) * avgX, Oxy / Ox2];
}

function calculateStarRating (beatmap, Mode, objectCount) {
    return new Promise((resolve, reject) => {
        try {
            let srdata = [];
            let score = {
                mode: Mode
            };
            const calc = new Calculator(score);
            for (let i = 1; i <= objectCount; i++) {
                srdata.push(Math.round(Number(calc.passedObjects(i).performance(beatmap).difficulty.stars) * 100) / 100);
            }
            resolve(srdata);
        } catch(e) {
            console.log(e);
            reject(e);
        }
    })
}

function calculateObject (beatmap, mode) {
    const score = {
        mode: mode
    };

    switch (mode) {
        case 0: {
            const objectdata = new Calculator(score).performance(beatmap).difficulty;
            return objectdata.nCircles + objectdata.nSliders + objectdata.nSpinners;
        }

        case 1: {
            const objectdata = new Calculator(score).mapAttributes(beatmap);
            return objectdata.nCircles;
        }

        case 2: {
            const objectdata = new Calculator(score).performance(beatmap).difficulty;
            return objectdata.maxCombo;
        }

        case 3: {
            const objectdata = new Calculator(score).mapAttributes(beatmap);
            return objectdata.nCircles + objectdata.nSliders + objectdata.nSpinners;
        }
    }
}

function divideInto100Parts(data) {
    const result = [];
    const length = data.length;
    const step = Math.floor(length / 100);
    for (let i = 0; i < length; i += step) {
        result.push(data[i]);
    }
    let n = result.length - 100;
    for (let i = 0; i < n; i++) {
        const index = Math.floor(Math.random() * result.length);
        result.splice(index, 1);
    }
    return result;
}

function labelarray(count) {
    const countarray = new Array(100);
    countarray.fill(".");
    countarray[0] = 0;
    countarray[24] = 25
    countarray[49] = 50;
    countarray[74] = 75;
    countarray[count - 1] = 100;
    return countarray;
}

function modeconvertforlinks(mode) {
    switch (Number(mode)) {
        case 0:
            return "osu";
        case 1:
            return "taiko";
        case 2:
            return "fruits";
        case 3:
            return "mania";
        default:
            return "nomode";
    }
}

module.exports = {
    GetUserData,
    GetMapData,
    GetUserRecent,
    GetUserScore,
    CalculatePPSR,
    CheckMapData,
    Mod,
    URLBuilder,
    Tools,
    CalculateGlobalPP,
    SRChart
};
