//これらのコードはGithubにあるRoanH/osu-BonusPPのJavaコード(https://github.com/RoanH/osu-BonusPP)をJSに変換したものになります。GPL-3.0ライセンスの下で利用しています。
module.exports.calculateScorePP = (scores, userplaycount) => {
    let scorepp = 0.0;

    for (let i = 0; i < scores.length; i++) {
        scorepp += scores[i] * Math.pow(0.95, i);
    }

    return scorepp + extraPolatePPRemainder(scores, userplaycount);
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
        if (val <= 0.0) {
            break;
        }
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
