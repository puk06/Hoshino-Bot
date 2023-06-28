module.exports.parseMods = (mods) => {
	const activeMods = [];
	for (let i = 0; i < 14; i++) {
		const bit = 1 << i;
		if ((mods & bit) === bit) {
			activeMods.push(ModStrings[bit])
		}
	}
	return activeMods;
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

module.exports.parseModString = (modStringArray) => {
	const mods = modStringArray.reduce((acc, modString) => {
		const modValue = ModtoStrings[modString];
		if (modValue) {
			return acc | modValue;
		};
		return acc;
		}, 0
	);
	return mods;
};

const ModtoStrings = {
	"NM": 0,
	"nm": 0,
	"NF": 1,
	"nf": 1,
	"EZ": 2,
	"ez": 2,
	"HD": 8,
	"hd": 8,
	"HR": 16,
	"hr": 16,
	"SD": 32,
	"sd": 32,
	"DT": 64,
	"dt": 64,
	"RX": 128,
	"rx": 128,
	"HT": 256,
	"ht": 256,
	"NC": 512,
	"nc": 512,
	"FL": 1024,
	"fl": 1024,
	"Autoplay": 2048,
	"autoplay": 2048,
	"Relax2": 8192,
	"relax2": 8192,
	"PF": 16384,
	"pf": 16384,
};

module.exports.splitString = (modstrings) => {
	if (!Array.isArray(modstrings)) {
		throw new Error("引数が配列ではありません。");
	}
	let modstring = null;
	for (const str of modstrings) {
		if (typeof str === "string" && RegExp(/^[a-zA-Z]+$/).exec(str)) {
			modstring = str;
			break;
		};
	};
	if (modstring === null) {
		throw new Error("配列の中に処理対象の文字列が含まれていません。");
	};
	const result = [];
	for (let i = 0; i < modstring.length; i += 2) {
		result.push(modstring.substring(i, i + 2));
	};
	return result;
};
