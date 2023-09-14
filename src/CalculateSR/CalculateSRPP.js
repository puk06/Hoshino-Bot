//必要なライブラリの読み込み
const { Beatmap, Calculator } = require("../../node_modules/rosu-pp");
const axios = require("../../node_modules/axios");

//SRとPPを計算する関数
module.exports.calculateSR = async (beatmapId, mods, mode) => {
	const beatmapFile = await getOsuBeatmapFile(beatmapId);
	const srppdata = calculateStarRating(beatmapFile, mods, mode);
	return {
		sr: parseFloat(srppdata.sr.toFixed(2)),
		S0: parseFloat(srppdata.S0.toFixed(2)),
		S1: parseFloat(srppdata.S1.toFixed(2)),
		S2: parseFloat(srppdata.S2.toFixed(2)),
		S3: parseFloat(srppdata.S3.toFixed(2)),
		S4: parseFloat(srppdata.S4.toFixed(2)),
		S5: parseFloat(srppdata.S5.toFixed(2)),
		DTSR: parseFloat(srppdata.DTSR.toFixed(2)),
		DTSS: parseFloat(srppdata.DTPP.toFixed(2))
	}
}

//osuのbeatmapファイルを取得する関数
function getOsuBeatmapFile (beatmapId) {
	return axios(`https://osu.ppy.sh/osu/${beatmapId}`,
		{
			responseType: "arrayBuffer",
		}
	)
}

//SRとPPを計算する関数
function calculateStarRating (beatmap, mods, mode) {
	let map = new Beatmap({ bytes: new Uint8Array(Buffer.from(beatmap.data)) });
	let score = {
		mode: mode,
		mods: mods,
	};

	let calc = new Calculator(score);
	let Calculated = calc.performance(map);

	let DTscore = {
		mode: mode,
		mods: 64,
	}

	let DTcalc = new Calculator(DTscore);
	let DTcalculated = DTcalc.performance(map);
	return {
		sr: parseFloat(Calculated.difficulty.stars.toFixed(2)),
		S0: parseFloat(calc.acc(100).performance(map).pp.toFixed(2)),
		S1: parseFloat(calc.acc(99.5).performance(map).pp.toFixed(2)),
		S2: parseFloat(calc.acc(99).performance(map).pp.toFixed(2)),
		S3: parseFloat(calc.acc(98).performance(map).pp.toFixed(2)),
		S4: parseFloat(calc.acc(97).performance(map).pp.toFixed(2)),
		S5: parseFloat(calc.acc(95).performance(map).pp.toFixed(2)),
		DTSR: parseFloat(DTcalculated.difficulty.stars.toFixed(2)),
		DTPP: parseFloat(DTcalculated.acc(100).performance(map).pp.toFixed(2))
	}
}

//SRとPPを計算する関数(Accは指定)
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
	}
}

//SRとPPを計算する関数(Accは指定)
module.exports.calculateSRwithacc = async (beatmapId, mods, mode, acc, misses, maxcombo) => {
	const beatmapFile = await getOsuBeatmapFile(beatmapId);
	const srppdata = calculateStarRatingwithacc(beatmapFile, mods, mode, acc, misses, maxcombo);
	return {
		sr: parseFloat(srppdata.sr.toFixed(2)),
		ppwithacc: parseFloat(srppdata.ppwithacc.toFixed(2)),
		SSPP: parseFloat(srppdata.SSPP.toFixed(2))
	}
}
