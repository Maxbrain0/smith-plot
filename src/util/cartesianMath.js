import math from 'mathjs'
import * as d3 from 'd3'

// Map for quick unit conversion
const unitMap = new Map([
  ['HZ', 1],
  ['KHZ', 1e3],
  ['MHZ', 1e6],
  ['GHZ', 1e9],
  ['THZ', 1e12],
  ['PHZ', 1e15]
])

const getSComponents = sParamsRealImag => {
  const sRe = []
  const sIm = []
  const sDb = []
  const sMag = []
  const sAngle = []
  const sDeg = []

  sParamsRealImag.forEach(sParam => {
    const mag = math.sqrt(sParam.re * sParam.re + sParam.im * sParam.im)
    const angle = math.atan2(sParam.im, sParam.re)
    sRe.push(sParam.re)
    sIm.push(sParam.im)
    sMag.push(mag)
    sDb.push(20 * math.log10(mag))
    sAngle.push(angle)
    sDeg.push((angle * 180) / Math.PI)
  })

  return {
    sRe,
    sIm,
    sMag,
    sDb,
    sAngle,
    sDeg
  }
}

const getPlotData = (plots, selectedPlotType, viewPort, axesSettings) => {
  // create linear scales based on max dimensions
  const plotsAllTypes = plots.map(plot => {
    return {
      ...getSComponents(plot.s),
      freq: normalizeFreq(plot.freq, axesSettings.plotFreqUnit, plot.unit)
    }
  })
  const limits = getLimits(plotsAllTypes, selectedPlotType)
  const yMin = axesSettings.insetTop
  const yMax = viewPort.y - axesSettings.insetBottom

  const yScale = d3
    .scaleLinear()
    .domain([limits.yMin, limits.yMax])
    .range([yMax, yMin])

  const xMin = axesSettings.insetLeft
  const xMax = viewPort.x - axesSettings.insetRight

  const xScale = d3
    .scaleLinear()
    .domain([limits.xMin, limits.xMax])
    .range([xMin, xMax])

  // a path representing the y axis
  const yAxisPath = d3.path()
  yAxisPath.moveTo(0, yMin)
  yAxisPath.lineTo(0, yMax)

  const xAxisPath = d3.path()
  xAxisPath.moveTo(xMin, 0)
  xAxisPath.lineTo(xMax, 0)

  // zero path will be used for a dashed line at y = 0 if plot contains y = 0
  let zeroPath = null

  if (plotsAllTypes.length <= 0) {
    return {
      yAxisPath: yAxisPath.toString(),
      xAxisPath: xAxisPath.toString(),
      ticksY: null,
      ticksX: null,
      zeroPath,
      plotPaths: null,
      yScale,
      xScale
    }
  }

  // compute positions of tick marks for both axes
  const ticksY = []

  for (let i = 0; i <= axesSettings.yTicks; i++) {
    const labelHeight =
      limits.yMin + (limits.yMax - limits.yMin) * (i / axesSettings.yTicks)
    ticksY.push({
      label: labelHeight,
      offset: yScale(labelHeight)
    })
  }

  const ticksX = []

  for (let i = 0; i <= axesSettings.yTicks; i++) {
    const labelOffset =
      limits.xMin + (limits.xMax - limits.xMin) * (i / axesSettings.xTicks)
    ticksX.push({
      label: labelOffset,
      offset: xScale(labelOffset)
    })
  }

  // add data for a dashed line horizontal line at 0 if scale goes from negative to positive
  if (limits.yMin < 0 && limits.yMax > 0) {
    const path0 = d3.path()
    path0.moveTo(0, yScale(0))
    path0.lineTo(
      viewPort.x - axesSettings.insetRight - axesSettings.insetLeft,
      yScale(0)
    )

    zeroPath = path0.toString()
  }

  // get plot paths while we're at it since we have all the dadgummed info we dun need
  // plotPaths will contain an array of path strings
  const lineGenerator = d3
    .line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y))
    .curve(d3.curveMonotoneX)

  const plotPaths = plotsAllTypes.map(plot => {
    const pathData = []

    // need to find more efficient way to do this before hand in data store
    for (let i = 0; i < plot.freq.length; i++) {
      pathData.push({
        x: plot.freq[i],
        y: plot[selectedPlotType][i]
      })
    }

    const path = lineGenerator(pathData)
    return { path, pathData }
  })

  return {
    yAxisPath: yAxisPath.toString(), // path of the yAxis
    xAxisPath: xAxisPath.toString(),
    ticksY,
    ticksX,
    zeroPath,
    plotPaths,
    yScale,
    xScale
  }
}

const getLimits = (plots, selectedPlotType) => {
  const extentY = []
  const extentX = []
  plots.forEach(plot => {
    extentY.push(...d3.extent(plot[selectedPlotType]))
    extentX.push(...d3.extent(plot.freq))
  })

  return {
    yMin: d3.min(extentY),
    yMax: d3.max(extentY),
    xMin: d3.min(extentX),
    xMax: d3.max(extentX)
  }
}

const normalizeFreq = (frequencies, outputUnit, inputUnit) => {
  return frequencies.map(
    frequency => frequency * (unitMap.get(inputUnit) / unitMap.get(outputUnit))
  )
}

export { getSComponents, getPlotData, normalizeFreq }