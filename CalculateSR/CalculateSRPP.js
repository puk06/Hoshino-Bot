//require ribrary
const { Beatmap, Calculator } = require("rosu-pp");
const axios = require("axios");

module.exports.calculateSR = async (beatmapId, mods, mode) => {
	try {
		const beatmapFile = await getOsuBeatmapFile(beatmapId);
		const srppdata = calculateStarRating(beatmapFile, mods, mode);
		return {
			sr: parseFloat(srppdata.sr.toFixed(2)),
			S0: parseFloat(srppdata.S0.toFixed(2)),
			S1: parseFloat(srppdata.S1.toFixed(2)),
			S2: parseFloat(srppdata.S2.toFixed(2)),
			S3: parseFloat(srppdata.S3.toFixed(2)),
			S4: parseFloat(srppdata.S4.toFixed(2)),
			S5: parseFloat(srppdata.S5.toFixed(2))
		};
	}catch(e){
		console.log(e);
		return 0;
	};
};

function getOsuBeatmapFile (beatmapId) {
	return axios(`https://osu.ppy.sh/osu/${beatmapId}`, {
		responseType: "arrayBuffer",
		}
	);
};

function calculateStarRating (beatmap, mods, mode) {
	let map = new Beatmap({ bytes: new Uint8Array(Buffer.from(beatmap.data)) });
	let score = {
		mode: mode,
		mods: mods,
	};
	let calc = new Calculator(score);
	let Calculated = calc.performance(map);
	return {
		sr: parseFloat(Calculated.difficulty.stars.toFixed(2)),
		S0: parseFloat(calc.acc(100).performance(map).pp.toFixed(2)),
		S1: parseFloat(calc.acc(99.5).performance(map).pp.toFixed(2)),
		S2: parseFloat(calc.acc(99).performance(map).pp.toFixed(2)),
		S3: parseFloat(calc.acc(98).performance(map).pp.toFixed(2)),
		S4: parseFloat(calc.acc(97).performance(map).pp.toFixed(2)),
		S5: parseFloat(calc.acc(95).performance(map).pp.toFixed(2))
	};
};

function calculateStarRatingwithacc (beatmap, mods, mode, Acc, misses, maxcombo) {
	let map = new Beatmap({ bytes: new Uint8Array(Buffer.from(beatmap.data)) });
	let score = {
		mode: mode,
		mods: mods,
	};
	let calc = new Calculator(score);
	let Calculated = calc.performance(map);
	return {
		sr: parseFloat(Calculated.difficulty.stars.toFixed(2)),
		ppwithacc: parseFloat(calc.acc(Acc).combo(maxcombo).nMisses(misses).performance(map).pp.toFixed(2)),
		SSPP: parseFloat(calc.acc(100).nMisses(0).performance(map).pp.toFixed(2))
	};
};

module.exports.calculateSRwithacc = async (beatmapId, mods, mode, acc, misses, maxcombo) => {
	try{
		const beatmapFile = await getOsuBeatmapFile(beatmapId);
		const srppdata = calculateStarRatingwithacc(beatmapFile, mods, mode, acc, misses, maxcombo);
		return {
			sr: parseFloat(srppdata.sr.toFixed(2)),
			ppwithacc: parseFloat(srppdata.ppwithacc.toFixed(2)),
			SSPP: parseFloat(srppdata.SSPP.toFixed(2))
		};
	}catch(e){
		console.log(e);
		return 0;
	};
};
