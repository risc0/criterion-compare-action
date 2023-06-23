function convertDurToSeconds(dur, units) {
    let seconds;
    switch (units) {
        case "s":
            seconds = dur;
            break;
        case "ms":
            seconds = dur / 1000;
            break;
        case "µs":
            seconds = dur / 1000000;
            break;
        case "ns":
            seconds = dur / 1000000000;
            break;
        default:
            seconds = dur;
            break;
    }

    return seconds;
}

function isSignificant(changesDur, changesErr, baseDur, baseErr) {
    if (changesDur < baseDur) {
        return changesDur + changesErr < baseDur || baseDur - baseErr > changesDur;
    } else {
        return changesDur - changesErr > baseDur || baseDur + baseErr < changesDur;
    }
}

function chunks(arr, n) {
    let res = [];
    for (let i = 0; i < arr.length; i += n) {
        res.push(arr.slice(i, i + n));
    }
    return res;
}

function splitResultsLine(line) {
    let splits = line.split(/\s{2,}/);
    return [splits[0], splits[1], splits[2], splits[3]]
}

function convertToMarkdown(ctx_sha, results, prettyName) {
    /* Example results:
        fib/100/proof
        -------------
        new      1.00   1978.5±38.87ms  16.1 KElem/sec
        base     1.04        2.0±0.05s  15.6 KElem/sec

        fib/100/run
        -----------
        new      1.00     264.8±5.57ms  120.6 KElem/sec
        base     1.02     269.5±6.09ms  118.6 KElem/sec

        fib/200/proof
        -------------
        new      1.00        2.1±0.02s  15.3 KElem/sec
        base     1.03        2.1±0.02s  14.9 KElem/sec

        fib/200/run
        -----------
        base     1.00     260.2±3.60ms  122.8 KElem/sec
        new      1.00     260.2±2.00ms  122.8 KElem/sec
    */

    let resultLines = results.trimRight().split("\n");
    let lines = resultLines.filter(line => !line.startsWith("--") && line != "");

    // if (!(lines[1].startsWith("changes") && lines[2].startsWith("base"))) {
    //     return `
    //     <details close>
    //     <summary>Click to hide benchmark</summary>
    //       ## Benchmark for ${prettyName}
    //       Benchmarks have changed between the two branches, unable to diff.
    //     </details>
    //     `;
    // }

    let benchResults = chunks(lines, 3).map(([name, changes, base]) => {
        let [_baseName, baseFactor, baseDuration, baseBandwidth] = splitResultsLine(base);
        let [_changesName, changesFactor, changesDuration, changesBandwidth] = splitResultsLine(changes);

        let baseUndefined = typeof baseDuration === "undefined";
        let changesUndefined = typeof changesDuration === "undefined";

        if (!name || (baseUndefined && changesUndefined)) {
            return "";
        }

        let difference = "N/A";
        if (!baseUndefined && !changesUndefined) {
            changesFactor = Number(changesFactor);
            baseFactor = Number(baseFactor);

            let changesDurSplit = changesDuration.split("±");
            let changesUnits = changesDurSplit[1].slice(-2);
            let changesDurSecs = convertDurToSeconds(
                changesDurSplit[0],
                changesUnits
            );
            let changesErrorSecs = convertDurToSeconds(
                changesDurSplit[1].slice(0, -2),
                changesUnits
            );

            let baseDurSplit = baseDuration.split("±");
            let baseUnits = baseDurSplit[1].slice(-2);
            let baseDurSecs = convertDurToSeconds(baseDurSplit[0], baseUnits);
            let baseErrorSecs = convertDurToSeconds(
                baseDurSplit[1].slice(0, -2),
                baseUnits
            );

            difference = -(1 - changesDurSecs / baseDurSecs) * 100;
            difference =
                (changesDurSecs <= baseDurSecs ? "" : "+") +
                difference.toFixed(2) +
                "%";
            if (
                isSignificant(
                    changesDurSecs,
                    changesErrorSecs,
                    baseDurSecs,
                    baseErrorSecs
                )
            ) {
                if (changesDurSecs < baseDurSecs) {
                    changesDuration = `**${changesDuration}**`;
                } else if (changesDurSecs > baseDurSecs) {
                    baseDuration = `**${baseDuration}**`;
                }

                difference = `**${difference}**`;
            }
        }

        if (baseUndefined) {
            baseDuration = "N/A";
        }

        if (changesUndefined) {
            changesDuration = "N/A";
        }

        name = name.replace(/\|/g, "\\|");

        return `| ${name} | ${baseDuration} | ${changesDuration} | ${difference} |`;
    }
    )
        .join("\n");

    let shortSha = ctx_sha.slice(0, 7);

    if (prettyName) {
        prettyName += " ";
    }
    // NOTE: use <details open> for default expansion of the block.
    let benchmarks = `### Benchmark for ${prettyName}${shortSha}
    
    
  
  | Test | Base         | PR               | % |
  |------|--------------|------------------|---|
  ${benchResults}
  
  `
  
  return `<details close>
  <summary>Benchmark for ${prettyName}${shortSha}</summary>
  ${benchmarks}
  </details>`;
}

module.exports = { convertToMarkdown };
