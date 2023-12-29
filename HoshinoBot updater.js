//必要なライブラリをインポート
const fs = require('fs');
const https = require('https');

//ダウンロードを実行する関数
module.exports.downloadHoshinobotFile = (url, savePath, callback) => {
    https.get(url, (response) => {
        const statusCode = response.statusCode;

        if (statusCode !== 200) {
            callback(new Error(`Failed to Update HoshinoBot. Status Code: ${statusCode}`));
            response.resume();
            return;
        }

        const file = fs.createWriteStream(savePath);
        response.pipe(file);

        file.on('finish', () =>
            {
                file.close(() => {
                    callback(null);
                });
            }
        );
    }).on('error', (error) =>
        {
            callback(error);
        }
    );
};

module.exports.getCommitDiffofHoshinobot = (owner, repo, file, callback) => {
    const options = {
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/commits?path=${file}`,
        headers: {
            'User-Agent': 'Node.js',
        },
    };

    https.get(options, (response) => {
        let data = '';

        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            const commits = JSON.parse(data);

            if (commits.length === 0) {
                callback(new Error('No commits found for the file.'));
                return;
            }

            const latestCommitSha = commits[0].sha;

            const diffOptions = {
                hostname: 'api.github.com',
                path: `/repos/${owner}/${repo}/commits/${latestCommitSha}`,
                headers: {
                    'User-Agent': 'Node.js',
                },
            };

            https.get(diffOptions, (diffResponse) => {
                let diffData = '';
            
                diffResponse.on('data', (chunk) => {
                    diffData += chunk;
                });
            
                diffResponse.on('end', () => {
                    const commitDiff = JSON.parse(diffData);
                    const files = commitDiff.files;
            
                    const fileDiff = files.find((f) => f.filename === file);
                    if (fileDiff) {
                        const commitMessage = commitDiff.commit.message;
            
                        callback(null, commitMessage);
                    } else {
                        callback(new Error('File not found in the commit diff.'));
                    }
                });
            }).on('error', (error) => {
                callback(error);
            });
        });
    }).on('error', (error) => {
        callback(error);
    });
};
