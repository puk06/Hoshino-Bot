const path = require("node:path");
const fs = require("../node_modules/fs-extra");

/**
 * A utility class that provides various helper methods.
 */
class Tools {
    /**
     * Generates a random slot result.
     * @returns {string[]} An array of three random symbols.
     */
    static generateSlotResult() {
        const symbols = ['🍒', '🍊', '🍇', '🔔', '💰', '⌚', '⛵'];
        const result = [];
        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * symbols.length);
            result.push(symbols[randomIndex]);
        }
        return result;
    }

    /**
     * Evaluates the result of a slot machine game and returns the corresponding score.
     * @param {Array} result - The result of the slot machine game, represented as an array of three elements.
     * @returns {BigInt} The score based on the result of the slot machine game.
     */
    static evaluateSlotResult(result) {
        switch (true) {
            case result[0] == result[1] && result[1] == result[2]:
                return 30n;
            case result[0] == result[1] || result[1] == result[2]:
                return 10n;
            case result[0] == result[2]:
                return 5n;
            default:
                return 0n;
        }
    }

    /**
     * Converts a number to a Japanese unit representation.
     * @param {string} num - The number to be converted.
     * @returns {string} - The Japanese unit representation of the number.
     */
    static toJPUnit(num) {
        const str = num;
        if (str.length >= 216) {
            return "約" + `${this.formatBigInt(str)}`;
        } else {
            let n = "";
            let count = 0;
            let ptr = 0;
            let kName = ["万","億","兆","京","垓","杼","穰","溝","澗","正","載","極","恒河沙","阿僧祇","那由他","不可思議","無量大数","無限超越数","無限超超越数","無限高次超越数","超限大数","超限超越大数","超限高次大数","超超限大数","超超限超越大数","超超限高次大数","超超超限大数","無辺数","無限大数","無限極数","無窮数","無限巨数","無涯数","無辺無数","無窮無数","無限超数","無辺超数","無尽数","無量超数","無辺絶数","無限絶数","イクカン","イガグン","レジギガス","イイググ","イガグググ","イカレジ","イカマニア","イガ","イグ","グイグイ","イクンカ","イカクンガ"]
            for (let i = str.length - 1; i >= 0; i--) {
                n = str.charAt(i) + n;
                count++;
                if ((count % 4 == 0) && (i != 0)) n = kName[ptr++] + n;
            }
            return n;
        }
    }

    /**
     * Formats a BigInt number.
     * If the number is greater than or equal to 10^216, it returns the number in scientific notation.
     * Otherwise, it returns the number as a string with commas for thousands separators.
     * @param {BigInt} num - The BigInt number to format.
     * @returns {string} The formatted number.
     */
    static formatBigInt(num) {
        const str = num.toString();
        if (str.length >= 216) {
            const power = str.length - 1;
            const numstr = str.slice(0, 2) + '.' + str.slice(2, 5).padEnd(3, '0');
              return `${numstr} * 10^${power}`;
        }
        return str.toLocaleString();
    }

    /**
     * Formats the given time in seconds into a string representation of minutes and seconds.
     * @param {number} sec - The time in seconds.
     * @returns {string} The formatted time string in the format "minutes:seconds".
     */
    static formatTime(sec) {
        const min = Math.floor(sec / 60);
        const second = Math.floor(sec % 60);
        return `${min}:${second.toString().padStart(2, "0")}`;
    }

    /**
     * Formats the hits based on the given score and mode.
     *
     * @param {object} score - The score object containing hit counts.
     * @param {number} mode - The mode to determine the format.
     * @returns {string} The formatted hits.
     */
    static formatHits(score, mode) {
        switch (mode) {
            case 0:
                return `{${score.n300}/${score.n100}/${score.n50}/${score.nMisses}}`;
    
            case 1:
                return `{${score.n300}/${score.n100}/${score.nMisses}}`;
    
            case 2:
                return `{${score.n300}/${score.n100}/${score.n50}/${score.nMisses}}`;
    
            case 3:
                return `{${score.nGeki}/${score.n300}/${score.nKatu}/${score.n100}/${score.n50}/${score.nMisses}}`;

            default:
                return `{${score.n300}/${score.n100}/${score.n50}/${score.nMisses}}`;
        }
    }

    /**
     * Finds the different elements between two arrays.
     * @param {Array} array1 - The first array.
     * @param {Array} array2 - The second array.
     * @returns {Array|null} - An array containing the different elements, or null if there are no differences.
     */
    static findDifferentElements(array1, array2) {
        if (array1.length == 0) return array2.length > 0 ? array2 : null;
        if (array2.length == 0) return null;
        if (array2.length < 15 || array1.length < 15) {
            return array2.filter((x) => !array1.includes(x)).length > 0 ? array2.filter((x) => !array1.includes(x)) : null;
        }
    
        const diffArray = [];
        const newCharts = array2.filter(chart => !array1.includes(chart) && !array1.includes(chart - 1));
        if (newCharts.length > 0) {
            diffArray.push(...newCharts);
            const filteredDiffArray = diffArray.filter(chart => !array1.includes(chart) && !array1.includes(chart - 1));
            const finalDiffArray = filteredDiffArray.filter((chart, index, array) => {
                return array.indexOf(chart) == index;
            });
            return finalDiffArray.length > 0 ? finalDiffArray : null;
        } else {
            return null;
        }
    }
    
    /**
     * Returns an array of file names sorted by their last modified date in ascending order.
     * @param {string} directory - The directory path to search for files.
     * @returns {string[]} - An array of file names sorted by their last modified date.
     */
    static getFilesSortedByDate(directory) {
        const fileStats = fs.readdirSync(directory).map(file => ({
            name: file,
            stat: fs.statSync(path.join(directory, file))
        }));
        fileStats.sort((a, b) => a.stat.mtime.getTime() - b.stat.mtime.getTime());
        return fileStats.map(fileStat => fileStat.name);
    }

    /**
     * Converts a rank into its corresponding emoji representation.
     * @param {string} rank - The rank to be converted.
     * @returns {string} - The emoji representation of the rank.
     */
    static rankconverter(rank) {
        switch (rank) {
            case "F":
                return "<:rankingF:1198994687445442701>";
            case "D":
                return "<:rankingD:1198994691123847270>";
            case "C":
                return "<:rankingC:1198994693275529329>";
            case "B":
                return "<:rankingB:1198994696299630602>";
            case "A":
                return "<:rankingA:1198994699298553906>";
            case "S":
                return "<:rankingS:1198994677433643008>";
            case "X":
                return "<:rankingX:1198994685595750453>";
            case "SH":
                return "<:rankingSH:1198994680617111612>";
            case "XH":
                return "<:rankingXH:1198994682731040870>";
            default:
                return "";
        }
    }

    /**
     * Checks if a value is NaN and returns 0 if it is.
     * @param {number} num - The value to check.
     * @returns {number} - The original value if it is not NaN, otherwise 0.
     */
    static isNaNwithNumber(num) {
        return isNaN(num) ? 0 : num;
    }

    /**
     * Formats a number by adding a leading zero if it is less than 10.
     * @param {number} num - The number to be formatted.
     * @returns {string} The formatted number.
     */
    static formatNumber(num) {
        return num < 10 ? '0' + num : num.toString();
    }

    /**
     * Converts a mode string to its corresponding numeric value.
     * @param {string} str - The mode string to be converted.
     * @returns {number} The numeric value representing the mode.
     */
    static modeConvertMap(str) {
        switch (str) {
            case "osu":
                return 0;
            case "taiko":
                return 1;
            case "catch":
                return 2;
            case "mania":
                return 3;
            default:
                return 0;
        }
    }

    /**
     * Converts a number representing a game mode to its corresponding string representation.
     * @param {number} num - The number representing the game mode.
     * @returns {string} The string representation of the game mode.
     */
    static modeConvertAcc(num) {
        switch (Number(num)) {
            case 0:
                return "osu";
            case 1:
                return "taiko";
            case 2:
                return "fruits";
            case 3:
                return "mania";
            default:
                return "osu";
        }
    }

    /**
     * Creates a progress bar based on the given percentage.
     * @param {number} percent - The percentage value of the progress bar.
     * @returns {string} The progress bar string.
     */
    static createProgressBar(percent) {
        const progress = Math.round(20 * percent / 100);
        const emptyProgress = Math.round(20 * (100 - percent) / 100);
        const progressText = "#".repeat(progress);
        const emptyProgressText = "-".repeat(emptyProgress);
        return `[${progressText}${emptyProgressText}]`;
    }

    /**
     * Calculates the match percentage between two strings.
     *
     * @param {string} current - The current string.
     * @param {string} total - The total string.
     * @returns {number} The match percentage between the two strings.
     */
    static matchPercentage(current, total) {
        let data = current.split('').map((_, index) => current.slice(0, index + 1));
        for (let i = 0; i < current.length; i++) {
            data.push(current.slice(i));
        }
        data = data.flat().filter((x, i, self) => self.indexOf(x) === i);
        let matchPercentage = 0;
        for (const element of data) {
            const matchdata = total.replace(element, "");
            if ((total.length - matchdata.length) / total.length * 100 >= matchPercentage) {
                matchPercentage = (total.length - matchdata.length) / total.length * 100;
            }
        }
        return matchPercentage;
    }
}

module.exports = Tools;
