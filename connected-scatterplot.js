import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const colorScale = d3.scaleSequential(d3.interpolateSpectral);

let data = [];
let xaxis = "";
let yaxis = "";
let hueKey = "";

document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const content = e.target.result;
            
            data = d3.csvParse(content, d3.autoType); 
            xaxis = data.columns[2];  
            yaxis = data.columns[3];
            hueKey=data.columns[1];  
            chartContainer.innerHTML = '';
            chartContainer.appendChild(renderCsvContents(data,xaxis,yaxis,hueKey));
            createDropdownOptions(data); 
        };
        reader.readAsText(file);    
    }    
});     
 
function renderCsvContents(driving, xaxis, yaxis, hueKey) {
    const width = 928;
    const height = 720;  
    const marginTop = 20;  
    const marginRight = 30;
    const marginBottom = 30;
    const marginLeft = 40;
    const keys = driving.columns.filter(key => typeof driving[0][key] === "number");

    const x = d3.scaleLinear()
        .domain([0, d3.max(driving, d => d[xaxis])]).nice()
        .range([marginLeft, width - marginRight]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(driving, d => d[yaxis])]).nice()
        .range([height - marginBottom, marginTop]);

    const line = d3.line()
        .curve(d3.curveCatmullRom)
        .x(d => x(d[xaxis]))
        .y(d => y(d[yaxis]));

    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto;")
        .call(d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", zoomGraph));

    const l = length(line(driving));

    function getDataChange(index, data) {
        if (index === 0) {
            return 0;
        }
        return data[index][hueKey] - data[index - 1][hueKey];
    }

    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x).ticks(width / 80))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("y2", -height)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", width - 4)
            .attr("y", -4)
            .attr("font-weight", "bold")
            .attr("text-anchor", "end")
            .attr("fill", "currentColor")
            .text(xaxis));

    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y).ticks(null, "$.2f"))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("x2", width)
            .attr("stroke-opacity", 0.1))
        .call(g => g.select(".tick:last-of-type text").clone()
            .attr("x", 4)
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text(yaxis));

    const path = svg.append("path")
        .datum(driving)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2.5)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-dasharray", `0,${l}`)
        .attr("d", line)
        .transition()
        .duration(5000)
        .ease(d3.easeLinear)
        .attr("stroke-dasharray", `${l},${l}`);

    // svg.append("g")
    //     .attr("fill", "white")
    //     .attr("stroke", "black")
    //     .attr("stroke-width", 2)
    //     .selectAll("circle")
    //     .data(driving)
    //     .join("circle")
    //     .attr("cx", d => x(d.miles))
    //     .attr("cy", d => y(d.gas))
    //     .attr("r", 3);

    const label = svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .selectAll()
        .data(driving)
        .join("text")
        .attr("transform", d => `translate(${x(d[xaxis])},${y(d[yaxis])})`)
        .attr("fill-opacity", 0)
        .text(d => d.year)
        .attr("stroke", "white")
        .attr("paint-order", "stroke")
        .attr("fill", "currentColor")
        .each(function (d) {
            const t = d3.select(this);
            switch (d.side) {
                case "top": t.attr("text-anchor", "middle").attr("dy", "-0.7em"); break;
                case "right": t.attr("dx", "0.5em").attr("dy", "0.32em").attr("text-anchor", "start"); break;
                case "bottom": t.attr("text-anchor", "middle").attr("dy", "1.4em"); break;
                case "left": t.attr("dx", "-0.5em").attr("dy", "0.32em").attr("text-anchor", "end"); break;
            }
        });

    label.transition()
        .delay((d, i) => length(line(driving.slice(0, i + 1))) / l * (5000 - 125))
        .attr("fill-opacity", 1);

    function zoomGraph(event) {
        const { transform } = event;
        svg.attr("transform", transform);
        svg.attr("stroke-width", 1 / transform.k);
    }

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("text-align", "center")
        .style("padding", "8px")
        .style("background", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("pointer-events", "none");

        svg.selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => x(d[xaxis]))
        .attr("cy", d => y(d[yaxis]))
        .attr("r", 3)
        
        // .attr("fill", (d, i) => {
        //     if (i > 0) {
        //         return addTheColorForDifference(data[i - 1], d,xKey,yKey);
        //     }
        //     return "gray";
        // })
        .attr("fill", (d, i) => colorScale(getDataChange(i, driving)))
        .on("mouseover", (event, d) => {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(keys.map(key => `${key}: ${d[key]}`).join("<br/>"))
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
    // svg.selectAll("circle")
    //     .data(driving)
    //     .join("circle")
    //     .attr("cx", d => x(d[xaxis]))
    //     .attr("cy", d => y(d[yaxis]))
    //     .attr("r", 3)
    //     .attr("fill", (d, i) => colorScale(getDataChange(i, driving)));

    const minYear = d3.min(driving, d => d.year);
    const maxYear = d3.max(driving, d => d.year);

    d3.select("#start-year")
        .attr("min", minYear)
        .attr("max", maxYear)
        .attr("value", minYear)
        .on("input", function () {
            const endYear = parseInt(d3.select("#end-year").property("value"));
            if (parseInt(this.value) > endYear) {
                d3.select("#start-year").property("value", endYear);
                this.value = endYear;
            }
            d3.select("#start-year-value").text(this.value);
            filterAndRenderChart(this.value, endYear);
        });

    d3.select("#end-year")
        .attr("min", minYear)
        .attr("max", maxYear)
        .attr("value", maxYear)
        .on("input", function () {
            const startYear = parseInt(d3.select("#start-year").property("value"));
            if (parseInt(this.value) < startYear) {
                d3.select("#end-year").property("value", startYear);
                this.value = startYear;
            }
            d3.select("#end-year-value").text(this.value);
            filterAndRenderChart(startYear, this.value);
        });

    d3.select("#start-year-value").text(minYear);
    d3.select("#end-year-value").text(maxYear);

    const highlightPath = svg.append("path")
        .attr("fill", "none")
        .attr("stroke", "navy")
        .attr("stroke-width", 2.5)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round");

    function filterAndRenderChart(startYear, endYear) {
        const filteredData = driving.filter(d => d.year >= startYear && d.year <= endYear);

        highlightPath.datum(filteredData)
            .transition()
            .duration(500)
            .attr("d", line);
    }

    function length(path) {
        return d3.create("svg:path").attr("d", path).node().getTotalLength();
    }

    filterAndRenderChart(d3.min(driving, d => d.year), d3.max(driving, d => d.year));

    function addTheColorForDifference(previousData, currentData) {
        const deltaMiles = currentData.miles - previousData.miles;
        const deltaGas = currentData.gas - previousData.gas;

        const colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain([-Math.max(Math.abs(deltaMiles), Math.abs(deltaGas)), Math.max(Math.abs(deltaMiles), Math.abs(deltaGas))]);

        const colorValue = deltaMiles - deltaGas;

        return colorScale(colorValue);
    }

    

    const legend = svg
        .append("g")
        .attr("class", "legend")
        .attr("transform", "translate(" + (width - 200) + ",10)");

    const legendData = [
        { label: "Least Change", intensity: d3.min(driving, (d, i) => getDataChange(i, driving)) },
        { label: "Most Change", intensity: d3.max(driving, (d, i) => getDataChange(i, driving)) }
    ];

    const legendScale = d3.scaleLinear()
        .domain([legendData[0].intensity, legendData[1].intensity])
        .range([0, 1]);

    const defs = svg.append("g");
    const linearGradient = defs
        .append("linearGradient")
        .attr("id", "legendGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    legendScale.ticks(5).forEach((d) => {
        linearGradient
            .append("stop")
            .attr("offset", legendScale(d) * 100 + "%")
            .attr("stop-color", colorScale(d));
    });

    legend
        .append("rect")
        .attr("width", 150)
        .attr("height", 15)
        .style("fill", "url(#legendGradient)")
        .attr("stroke", "black");

    legendData.forEach((d, i) => {
        legend
            .append("text")
            .attr("class", "legend-label")
            .attr("x", i * 150)
            .attr("y", 25)
            .attr("text-anchor", i === 0 ? "start" : "end")
            .style("font-size", "10px")
            .text(d.label);
    });

    return svg.node();
}

function createDropdownOptions(data) {
    const keys = Object.keys(data[0]);
    const xDropdown = document.getElementById('x-axis');
    const yDropdown = document.getElementById('y-axis');
    const hueDropdown = document.getElementById('hue');
    keys.forEach(key => {
        if (typeof data[0][key] === 'number') {
            [xDropdown, yDropdown, hueDropdown].forEach(dropdown => {
                const option = document.createElement('option');
                option.text = key;
                option.value = key;
                dropdown.appendChild(option);
            });
        }
    });

    [xDropdown, yDropdown, hueDropdown].forEach(dropdown => {
        dropdown.addEventListener('change', updateChart);
    });
}

function updateChart() {
    if (data.length === 0) {
        console.error('Data not available or not loaded yet');
        return;
    }

    xaxis = document.getElementById('x-axis').value || xaxis;
    yaxis = document.getElementById('y-axis').value || yaxis;
    hueKey = document.getElementById('hue').value || hueKey;

    if (!xaxis || !yaxis) {
        console.error('X-axis or Y-axis not selected');
        return;
    }

    const scatterchartContainer = document.getElementById('chartContainer');
    scatterchartContainer.innerHTML = '';
    scatterchartContainer.appendChild(renderCsvContents(data, xaxis, yaxis, hueKey));
}