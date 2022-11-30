# tods-xls-converter

Convert xls files into TODS (Tennis Open Data Standards)

## Example

Add .xls, .xlsm, .xlsx files into `examples/sheets`. In the `examples` directory run `node` and then load `i.js`.

This process is used in development to be able to interact directly with the sheet objects and the analysis and results produced when workbooks are processed,
making it possible to test new functions against sheet objects, analysis, and already processed results.

As the project develops this will provide the template for bulk processing of spreadsheet files into TODS tournament records.

```console
node
.load i.js
```

:::note
`pnpm build` must be run each time source is modified
:::

### Interactive processing

The `i.js` script defines some utilities and saves current results in the global variable `r`.
The attributes of the global variable `props` can be modified and the files re-processed by typing `go()`.

```console
r // display results
print() // output analysis log
purge() // purge analysis log
go() // re-run
props // display current settings
```

### Functions and Utilities

The global variable `x` provides access to all functions exported by `xlsTODS`. Additionally, `x.f` provides access to work-in-progress utility functions.

`findTarget`: Search for target text across all file results, to determine where "problematic" data appears

```console
x.f.findTarget(r.fileResults, 'target')
```

## Interactvie Development

The test script `live.test.js` is a test harness for interactive development.
