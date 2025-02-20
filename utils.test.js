const utils = require("./utils");

test("critcmp to markdown test", () => {
  const input_data = `
fib/100/proof
-------------
changes     1.00     640.3±6.39ms  49.9 KElem/sec
base        1.36     871.3±7.24ms  36.7 KElem/sec

fib/100/run
-----------
changes     1.00     297.5±4.39ms  107.4 KElem/sec
base        1.68     499.5±1.59ms  64.0 KElem/sec

fib/200/proof
-------------
changes     1.00     645.8±6.61ms  49.5 KElem/sec
base        1.35     871.6±5.79ms  36.7 KElem/sec

fib/200/run
-----------
changes     1.00     301.9±6.16ms  105.8 KElem/sec
base        1.66     502.4±5.30ms  63.6 KElem/sec`;

  let markdown = utils.convertToMarkdown(
    "fc27559ad8d5f4a35712256ca38b94b394249d6d",
    input_data,
    "test",
  );
  expect(markdown.includes("Benchmark for test")).toBe(true);
  expect(
    markdown.includes(
      "| fib/100/proof | 871.3±7.24ms | **640.3±6.39ms** | **-26.51%** |",
    ),
  ).toBe(true);
  expect(
    markdown.includes(
      "| fib/100/run | 499.5±1.59ms | **297.5±4.39ms** | **-40.44%** |",
    ),
  ).toBe(true);
  expect(
    markdown.includes(
      "| fib/200/proof | 871.6±5.79ms | **645.8±6.61ms** | **-25.91%** |",
    ),
  ).toBe(true);
  expect(
    markdown.includes(
      "| fib/200/run | 502.4±5.30ms | **301.9±6.16ms** | **-39.91%** |",
    ),
  ).toBe(true);
});

test("critcmp multi-test data", () => {
  const input_data = `
fib/100/execute
---------------
changes     1.00     685.3±1.10ms  2.5 KElem/sec

fib/100/proof
-------------
base     1.00        3.9±0.05s  16.4 KElem/sec

fib/100/prove
-------------
changes     1.00        3.2±0.06s  19.8 KElem/sec

fib/100/run
-----------
base     1.00     691.3±1.04ms  92.6 KElem/sec

fib/100/total
-------------
changes     1.00        3.9±0.07s  458 Elem/sec

fib/1000/execute
----------------
changes     1.00     692.8±2.55ms  15.2 KElem/sec

fib/1000/prove
--------------
changes     1.00        3.2±0.06s  19.8 KElem/sec

fib/1000/total
--------------
changes     1.00        3.9±0.07s  2.7 KElem/sec

fib/10000/execute
-----------------
changes     1.00     752.3±1.77ms  130.8 KElem/sec

fib/10000/prove
---------------
changes     1.00       13.2±0.12s  19.3 KElem/sec

fib/10000/total
---------------
changes     1.00       14.0±0.11s  7.0 KElem/sec

fib/200/proof
-------------
base     1.00        3.9±0.07s  16.3 KElem/sec

fib/200/run
-----------
base     1.00     694.2±1.47ms  92.2 KElem/sec`;

  let markdown = utils.convertToMarkdown(
    "fc27559ad8d5f4a35712256ca38b94b394249d6d",
    input_data,
    "test",
  );
  expect(markdown.includes("Benchmark for test")).toBe(true);
  expect(
    markdown.includes(
      "Benchmarks have changed between the two branches, unable to diff",
    ),
  ).toBe(true);
});
