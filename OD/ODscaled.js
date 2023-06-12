module.exports.ODscaled = (od, mods) => {
	if (mods.includes("EZ")) {
		od /= 2;
	};
	if (mods.includes("HR")) {
		od *= 1.4;
	};
	od = Math.max(Math.min(od, 10), 0);
	return od;
};
