const { inspect } = require("util");
const exec = require("@actions/exec");
const core = require("@actions/core");
const github = require("@actions/github");
const utils = require("./utils");

const context = github.context;

async function main() {
  const inputs = {
    token: core.getInput("token", { required: true }),
    branchName: core.getInput("branchName", { required: true }),
    cwd: core.getInput("cwd"),
    benchName: core.getInput("benchName"),
    features: core.getInput("features"),
    defaultFeatures: core.getInput("defaultFeatures"),
    outputMarkdown: core.getInput("outputMarkdown"),
    prettyName: core.getInput("prettyName"),
  };
  core.debug(`Inputs: ${inspect(inputs)}`);

  const options = {};
  let myOutput = "";
  let myError = "";
  if (inputs.cwd) {
    options.cwd = inputs.cwd;
  }

  let benchCmd = ["bench"];
  if (inputs.benchName) {
    benchCmd = benchCmd.concat(["--bench", inputs.benchName]);
  }

  if (!inputs.defaultFeatures) {
    benchCmd = benchCmd.concat(["--no-default-features"]);
  }

  if (inputs.features) {
    benchCmd = benchCmd.concat(["--features", inputs.features]);
  }

  core.debug("### Install Critcmp ###");
  await exec.exec("cargo", ["install", "critcmp"]);

  core.debug("### Benchmark starting ###");
  await exec.exec(
    "cargo",
    benchCmd.concat(["--", "--save-baseline", "changes"]),
    options
  );
  core.debug("Changes benchmarked");
  await exec.exec("git", ["fetch"]);
  await exec.exec("git", [
    "checkout",
    core.getInput("branchName") || github.base_ref,
  ]);
  core.debug("Checked out to base branch");
  await exec.exec(
    "cargo",
    benchCmd.concat(["--", "--save-baseline", "base"]),
    options
  );
  core.debug("Base benchmarked");

  options.listeners = {
    stdout: (data) => {
      myOutput += data.toString();
    },
    stderr: (data) => {
      myError += data.toString();
    },
  };

  await exec.exec("critcmp", ["base", "changes", "--list"], options);

  core.setOutput("stdout", myOutput);
  core.setOutput("stderr", myError);

  let resultsAsMarkdown = utils.convertToMarkdown(context.sha, myOutput, inputs.prettyName);
  const collapsableResults = `
  <details>
  <summary>Click to Expand</summary>
  ${resultsAsMarkdown}
  </details>`
  // Exit early after setting output field.
  if (inputs.outputMarkdown) {
    core.setOutput("markdown", collapsableResults);
    console.info("Successfully set markdown as output");
    return;
  }

  // An authenticated instance of `@octokit/rest`
  const octokit = github.getOctokit(inputs.token);

  const contextObj = { ...context.issue };

  try {
    const { data: comment } = await octokit.rest.issues.createComment({
      owner: contextObj.owner,
      repo: contextObj.repo,
      issue_number: contextObj.number,
      body: ` <details>
      <summary>Click to Expand -- </summary>
      ${resultsAsMarkdown}
      </details>`,
    });
    core.info(
      `Created comment id '${comment.id}' on issue '${contextObj.number}' in '${contextObj.repo}'.`
    );
    core.setOutput("comment-id", comment.id);
  } catch (err) {
    core.warning(`Failed to comment: ${err}`);
    core.info("Commenting is not possible from forks.");

    // If we can't post to the comment, display results here.
    // forkedRepos only have READ ONLY access on GITHUB_TOKEN
    // https://github.community/t5/GitHub-Actions/quot-Resource-not-accessible-by-integration-quot-for-adding-a/td-p/33925
    const resultsAsObject = convertToTableObject(myOutput);
    console.table(resultsAsObject);
  }

  core.debug("Succesfully run!");
}

function convertToTableObject(results) {
  /* Example results:
    group                            base                                   changes
    -----                            ----                                   -------
    character module                 1.03     22.2±0.41ms        ? B/sec    1.00     21.6±0.53ms        ? B/sec
    directory module – home dir      1.02     21.7±0.69ms        ? B/sec    1.00     21.4±0.44ms        ? B/sec
    full prompt                      1.08     46.0±0.90ms        ? B/sec    1.00     42.7±0.79ms        ? B/sec
  */

  let resultLines = results.split("\n");
  let benchResults = resultLines
    .slice(2) // skip headers
    .map((row) => row.split(/\s{2,}/)) // split if 2+ spaces together
    .map(
      ([
        name,
        baseFactor,
        baseDuration,
        _baseBandwidth,
        changesFactor,
        changesDuration,
        _changesBandwidth,
      ]) => {
        changesFactor = Number(changesFactor);
        baseFactor = Number(baseFactor);

        let difference = -(1 - changesFactor / baseFactor) * 100;
        difference =
          (changesFactor <= baseFactor ? "" : "+") + difference.toPrecision(2);
        if (changesFactor < baseFactor) {
          changesDuration = `**${changesDuration}**`;
        } else if (changesFactor > baseFactor) {
          baseDuration = `**${baseDuration}**`;
        }

        return {
          name,
          baseDuration,
          changesDuration,
          difference,
        };
      }
    );

  return benchResults;
}

// IIFE to be able to use async/await
(async () => {
  try {
    await main();
  } catch (e) {
    console.log(e.stack);
    core.setFailed(`Unhanded error:\n${e}`);
  }
})();
