import React, { useEffect } from 'react';
import * as d3 from 'd3';
import SSF from "ssf"

const RadialGauge = (props) => {
	useEffect(() => {
		drawRadial(props)
	}, [props])
	return <div className='viz' />
}

function mapBetween(currentNum, minAllowed, maxAllowed, min, max) {
  	return (maxAllowed - minAllowed) * (currentNum - min) / (max - min) + minAllowed;
}

function wrap(text, width) {
  text.each(function() {
	var text = d3.select(this),
		words = text.text().split(/\s+/).reverse(),
		word,
		line = [],
		lineNumber = 0,
		lineHeight = 1.4, // ems
		y = text.attr("y"),
		x = text.attr("x"),
		dy = parseFloat(text.attr("dy")),
		tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
	while (word = words.pop()) {
	  line.push(word);
	  tspan.text(line.join(" "));
	  if (tspan.node().getComputedTextLength() > width) {
		line.pop();
		tspan.text(line.join(" "));
		line = [word];
		tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
	  }
	}
  });
}

function getLabel(rule, value, label, override) {
	// console.log(rule, value, label, override)
	label = override === "" ? label : override;
	if (rule === "value") {
		return `${value}`;
	} else if (rule === "label") {
		return `${label}`;
	} else if (rule === "both") {
		return `${value} ${label}`;
	} else if (rule === "none" ) {
		return ``;
	}
}

const drawRadial = (props) => {
	let limiting_aspect = props.w < props.h ? "vw" : "vh";
	let radius = 0.4*Math.min(props.w, props.h);
	let cutoutCalc = radius*(props.cutout/100);
	let valueLabelCalc = radius*(props.value_label_padding/100);
	let armLength = radius + props.arm;
	let gaugeAngle = props.angle * Math.PI * 2 / 360;
	let spinnerStandard = props.spinner/150;
	let spinnerLength = radius * spinnerStandard < cutoutCalc ? cutoutCalc : radius * spinnerStandard;

	if (props.target === undefined) {
		let max = props.range != undefined ? props.range[1] : Math.round(Math.max(value) * 1.3)
	} else {
		let max = props.range != undefined ? props.range[1] : Math.round(Math.max(value, target) * 1.3)
	}

	// Ditch whatever is in our viz window
	d3.select('.viz > *').remove();
	// div that houses the svg
	var div = d3.select('.viz')
	  	.style('overflow-x', 'hidden')
	  	.style('overflow-y', 'hidden')
	  	.style('position', 'fixed')
	  	.attr('height', '100%');
	// append a fresh svg
	const svg = d3.select('.viz').append('svg');
	svg.attr('width', props.w)
		.attr('height', props.h)
		.attr('id', 'svg-viz')
		.attr('preserveAspectRatio', 'xMidYMid meet')
	  	.attr('viewBox', `${props.w/-2} ${props.h/-2} ${props.w} ${props.h}`);
	let g = svg.append('g').attr('id', 'g-viz');
	// create the gauge background
	var generator = d3.arc()
      	.innerRadius(cutoutCalc)
      	.outerRadius(radius)
      	.startAngle(-gaugeAngle)
      	.endAngle(gaugeAngle);
  	var cover = g.append('path')
  		.attr('class', 'gauge_background')
  		.attr('d', generator)
  		.attr('fill', props.gauge_background)
  		.attr('stroke', 'none');

  	// find how much of the gauge is filled
  	// then fill the gauge
  	var proportion = mapBetween(props.value,0,1,props.range[0],props.range[1])
  	var value_standard = props.angle*2*proportion - props.angle;
  	var valueAngle = value_standard * Math.PI * 2 / 360;
  	var upBinary = props.angle < 90 ? -1 : 1;
  	if (props.gauge_fill_type === "progress") {
  		var fill_generator = d3.arc()
      	.innerRadius(cutoutCalc)
      	.outerRadius(radius)
      	.startAngle(-gaugeAngle)
      	.endAngle(valueAngle);
  		var gauge_fill = g.append('path')
  		.attr('class', 'gaugeFill')
  		.attr('d', fill_generator)
  		.attr('fill', props.color)
  		.attr('stroke', `${props.color}`)
  		.attr('stroke-width', '1px');
  	} else if (props.gauge_fill_type === "segment") {
  		let len = props.fill_colors.length
  		props.fill_colors.map((d, i) => {
  			var Jpro = i / len;
		  	var Jstan = props.angle*2*Jpro - props.angle;
		  	var JiAngle = Jstan * Math.PI * 2 / 360;
  			var Kpro = (i+1) / len;
		  	var Kstan = props.angle*2*Kpro - props.angle;
		  	var KiAngle = Kstan * Math.PI * 2 / 360;
		  	var fill_generator = d3.arc()
	      	.innerRadius(cutoutCalc)
	      	.outerRadius(radius)
	      	.startAngle(JiAngle)
	      	.endAngle(KiAngle);
	  		var gauge_fill = g.append('path')
	  		.attr('class', `gaugeFill-${i}`)
	  		.attr('d', fill_generator)
	  		.attr('fill', props.fill_colors[i])
	  		.attr('stroke', `${props.fill_colors[i]}`)
	  		.attr('stroke-width', '1px');
  		})
  	} else if (props.gauge_fill_type === "progress-gradient") {
  		let divisor = 1 / props.fill_colors.length
  		let which = Math.floor(proportion / divisor);
  		which = proportion >= 1 ? props.fill_colors.length-1 : which;
  		var fill_generator = d3.arc()
      	.innerRadius(cutoutCalc)
      	.outerRadius(radius)
      	.startAngle(-gaugeAngle)
      	.endAngle(valueAngle);
  		var gauge_fill = g.append('path')
  		.attr('class', 'gaugeFill')
  		.attr('d', fill_generator)
  		.attr('fill', props.fill_colors[which])
  		.attr('stroke', `${props.fill_colors[which]}`)
  		.attr('stroke-width', '1px');
  	}
  	// creates a left arm border
  	var leftArmArc = d3.arc()
	    .innerRadius(cutoutCalc*0.97)
	    .outerRadius(armLength)
	    .startAngle(-gaugeAngle)
	    .endAngle(-gaugeAngle);
  	g.append('path')
  		.attr('class', 'leftArmArc')
  		.attr('d', leftArmArc)
  		.attr('fill', props.gauge_background)
  		.attr('stroke', props.gauge_background)
  		.attr('stroke-width', props.arm_weight/5);
  	g.append('text')
  		.attr('class', 'minLabel')
  		.text(`${props.range_formatting === undefined || props.range_formatting === "" ? props.range[0] : SSF.format(props.range_formatting, props.range[0])}`)
  		.style('font-size', `${props.label_font}${limiting_aspect}`)
  		.style('font-family', 'Arial, Helvetica, sans-serif')
  		.style('fill', props.range_color)
  		.style('font-weight', "bold")
  		.attr('dx', `-${props.range_x}em`)
  		.attr('dy', `${-1*props.range_y}em`)
  		.attr('transform', `translate(${d3.select(".leftArmArc").node().getBBox().x} ${0 + upBinary*d3.select(".leftArmArc").node().getBBox().height - (props.angle > 90 ? 90 - props.angle : 0)})`);
  	// creates a right arm border
  	var rightArmArc = d3.arc()
        .innerRadius(cutoutCalc*0.97)
      	.outerRadius(armLength)
      	.startAngle(gaugeAngle)
      	.endAngle(gaugeAngle);
  	g.append('path')
  		.attr('class', 'rightArmArc')
  		.attr('d', rightArmArc)
  		.attr('fill', props.gauge_background)
  		.attr('stroke', props.gauge_background)
  		.attr('stroke-width', props.arm_weight/5);
  	g.append('text')
  		.attr('class', 'maxLabel')
  		.text(`${props.range_formatting === undefined || props.range_formatting === "" ? props.range[1] : SSF.format(props.range_formatting, props.range[1])}`)
  		.style('font-size', `${props.label_font}${limiting_aspect}`)
  		.style('font-family', 'Arial, Helvetica, sans-serif')
  		.style('fill', props.range_color)
  		.style('font-weight', "bold")
  		.attr('dx', `${props.range_x-1}em`)
  		.attr('dy', `${-1*props.range_y}em`)
  		.attr('transform', `translate(${d3.select(".rightArmArc").node().getBBox().x + d3.select(".rightArmArc").node().getBBox().width} ${0 + upBinary*d3.select(".rightArmArc").node().getBBox().height - (props.angle > 90 ? 90 - props.angle : 0)})`);
  	// create the spinner and point to the value
  	var spinnerArm = d3.arc()
      	.innerRadius(0)
      	.outerRadius(spinnerLength)
      	.startAngle(valueAngle)
      	.endAngle(valueAngle);
  	g.append('path')
  		.attr('class', 'spinnerArm')
  		.attr('d', spinnerArm)
  		.attr('fill', props.spinner_background)
  		.attr('stroke', props.spinner_background)
  		.attr('stroke-width', props.spinner_weight/10);
  	g.append('circle')
	  	.attr('class', 'spinnerCenter')
	  	.attr('r', props.spinner_weight/10)
	    .style('fill', props.spinner_background);
	d3.select(".spinnerArm").on("click", function(d,i) {
			LookerCharts.Utils.openDrillMenu({
	 			links: props.value_links,
	 			event: event
 			});
		})
	// find what percent of the gauge is equivalent to the target value
	if (props.target_source !== "off") {

	if (props.target_label_type === "both") {
		var target_proportion = mapBetween(props.target,0,1,props.range[0],props.range[1])
	  	var tarNeg = target_proportion < .5 ? -1 : 1;
	  	var target_standard = props.angle*2*target_proportion - props.angle;
	  	var targetAngle = target_standard * Math.PI * 2 / 360;
	  	var targetSpinner = d3.arc()
	      	.innerRadius(cutoutCalc)
	      	.outerRadius(radius)
	      	.startAngle(targetAngle)
	     	.endAngle(targetAngle);
	  	var targetLine = g.append('path')
	  		.attr('class', 'targetSpinner')
	  		.attr('d', targetSpinner)
	  		.attr('stroke', props.target_background)
	  		.attr('stroke-width', props.target_weight/10)
	  		.attr('stroke-dasharray', `${props.target_length} ${props.target_gap}`);
	  	// label the target spinner value
	  	var targetLabelArc = d3.arc()
	      	.innerRadius(radius*props.target_label_padding)
	      	.outerRadius(radius*props.target_label_padding)
	      	.startAngle(targetAngle)
	     	.endAngle(targetAngle);
	  	var targetLabelLine = g.append('path')
	  		.attr('class', 'targetLabel')
	  		.attr('d', targetLabelArc);
	  	g.append('text')
	  		.attr('class', 'targetValue')
	  		.text(`${props.target_rendered} ${props.target_label}`)
	  		.style('font-size', `${props.target_label_font}${limiting_aspect}`)
	  		.style('font-family', 'Arial, Helvetica, sans-serif')
	  		.attr('dy', '.35em')
	  		.attr('x', ()=>{
	  			if (tarNeg > 0) {
	  				return d3.select('.targetLabel').node().getBBox().x;
	  			} else {
	  				return d3.select('.targetLabel').node().getBBox().x - d3.select('.targetValue').node().getBBox().width
	  			}
	  		})
	  		.attr('y', () => {
	  			return d3.select('.targetLabel').node().getBBox().y
	  		});
	} else if (props.target_label_type === "dboth") {
		var target_proportion = mapBetween(props.target,0,1,props.range[0],props.range[1])
	  	var tarNeg = target_proportion < .5 ? -1 : 1;
	  	var target_standard = props.angle*2*target_proportion - props.angle;
	  	var targetAngle = target_standard * Math.PI * 2 / 360;
	  	var targetSpinner = d3.arc()
	      	.innerRadius(cutoutCalc)
	      	.outerRadius(radius)
	      	.startAngle(targetAngle)
	     	.endAngle(targetAngle);
	  	var targetLine = g.append('path')
	  		.attr('class', 'targetSpinner')
	  		.attr('d', targetSpinner)
	  		.attr('stroke', props.target_background)
	  		.attr('stroke-width', props.target_weight/10)
	  		.attr('stroke-dasharray', `${props.target_length} ${props.target_gap}`);
	  	// label the target spinner value
	  	var targetLabelArc = d3.arc()
	      	.innerRadius(radius*props.target_label_padding)
	      	.outerRadius(radius*props.target_label_padding)
	      	.startAngle(targetAngle)
	     	.endAngle(targetAngle);
	  	var targetLabelLine = g.append('path')
	  		.attr('class', 'targetLabel')
	  		.attr('d', targetLabelArc);
	  	g.append('text')
	  		.attr('class', 'targetValue')
	  		.text(`${props.target_rendered} ${props.target_dimension}`)
	  		.style('font-size', `${props.target_label_font}${limiting_aspect}`)
	  		.style('font-family', 'Arial, Helvetica, sans-serif')
	  		.attr('dy', '.35em')
	  		.attr('x', ()=>{
	  			if (tarNeg > 0) {
	  				return d3.select('.targetLabel').node().getBBox().x;
	  			} else {
	  				return d3.select('.targetLabel').node().getBBox().x - d3.select('.targetValue').node().getBBox().width
	  			}
	  		})
	  		.attr('y', () => {
	  			return d3.select('.targetLabel').node().getBBox().y
	  		});
	} else if (props.target_label_type === "dim") {
		var target_proportion = mapBetween(props.target,0,1,props.range[0],props.range[1])
	  	var tarNeg = target_proportion < .5 ? -1 : 1;
	  	var target_standard = props.angle*2*target_proportion - props.angle;
	  	var targetAngle = target_standard * Math.PI * 2 / 360;
	  	var targetSpinner = d3.arc()
	      	.innerRadius(cutoutCalc)
	      	.outerRadius(radius)
	      	.startAngle(targetAngle)
	     	.endAngle(targetAngle);
	  	var targetLine = g.append('path')
	  		.attr('class', 'targetSpinner')
	  		.attr('d', targetSpinner)
	  		.attr('stroke', props.target_background)
	  		.attr('stroke-width', props.target_weight/10)
	  		.attr('stroke-dasharray', `${props.target_length} ${props.target_gap}`);
	  	// label the target spinner value
	  	var targetLabelArc = d3.arc()
	      	.innerRadius(radius*props.target_label_padding)
	      	.outerRadius(radius*props.target_label_padding)
	      	.startAngle(targetAngle)
	     	.endAngle(targetAngle);
	  	var targetLabelLine = g.append('path')
	  		.attr('class', 'targetLabel')
	  		.attr('d', targetLabelArc);
	  	g.append('text')
	  		.attr('class', 'targetValue')
	  		.text(`${props.target_dimension}`)
	  		.style('font-size', `${props.target_label_font}${limiting_aspect}`)
	  		.style('font-family', 'Arial, Helvetica, sans-serif')
	  		.attr('dy', '.35em')
	  		.attr('x', ()=>{
	  			if (tarNeg > 0) {
	  				return d3.select('.targetLabel').node().getBBox().x;
	  			} else {
	  				return d3.select('.targetLabel').node().getBBox().x - d3.select('.targetValue').node().getBBox().width
	  			}
	  		})
	  		.attr('y', () => {
	  			return d3.select('.targetLabel').node().getBBox().y
	  		});
	} else if (props.target_label_type === "value"){
		var target_proportion = mapBetween(props.target,0,1,props.range[0],props.range[1])
	  	var tarNeg = target_proportion < .5 ? -1 : 1;
	  	var target_standard = props.angle*2*target_proportion - props.angle;
	  	var targetAngle = target_standard * Math.PI * 2 / 360;
	  	var targetSpinner = d3.arc()
	      	.innerRadius(cutoutCalc)
	      	.outerRadius(radius)
	      	.startAngle(targetAngle)
	     	.endAngle(targetAngle);
	  	var targetLine = g.append('path')
	  		.attr('class', 'targetSpinner')
	  		.attr('d', targetSpinner)
	  		.attr('stroke', props.target_background)
	  		.attr('stroke-width', props.target_weight/10)
	  		.attr('stroke-dasharray', `${props.target_length} ${props.target_gap}`);
	  	// label the target spinner value
	  	var targetLabelArc = d3.arc()
	      	.innerRadius(radius*props.target_label_padding)
	      	.outerRadius(radius*props.target_label_padding)
	      	.startAngle(targetAngle)
	     	.endAngle(targetAngle);
	  	var targetLabelLine = g.append('path')
	  		.attr('class', 'targetLabel')
	  		.attr('d', targetLabelArc);
	  	g.append('text')
	  		.attr('class', 'targetValue')
	  		.text(`${props.target_rendered}`)
	  		.style('font-size', `${props.target_label_font}${limiting_aspect}`)
	  		.style('font-family', 'Arial, Helvetica, sans-serif')
	  		.attr('dy', '.35em')
	  		.attr('x', ()=>{
	  			if (tarNeg > 0) {
	  				return d3.select('.targetLabel').node().getBBox().x;
	  			} else {
	  				return d3.select('.targetLabel').node().getBBox().x - d3.select('.targetValue').node().getBBox().width
	  			}
	  		})
	  		.attr('y', () => {
	  			return d3.select('.targetLabel').node().getBBox().y
	  		});
	} else if (props.target_label_type === "label"){
		var target_proportion = mapBetween(props.target,0,1,props.range[0],props.range[1])
	  	var tarNeg = target_proportion < .5 ? -1 : 1;
	  	var target_standard = props.angle*2*target_proportion - props.angle;
	  	var targetAngle = target_standard * Math.PI * 2 / 360;
	  	var targetSpinner = d3.arc()
	      	.innerRadius(cutoutCalc)
	      	.outerRadius(radius)
	      	.startAngle(targetAngle)
	     	.endAngle(targetAngle);
	  	var targetLine = g.append('path')
	  		.attr('class', 'targetSpinner')
	  		.attr('d', targetSpinner)
	  		.attr('stroke', props.target_background)
	  		.attr('stroke-width', props.target_weight/10)
	  		.attr('stroke-dasharray', `${props.target_length} ${props.target_gap}`);
	  	// label the target spinner value
	  	var targetLabelArc = d3.arc()
	      	.innerRadius(radius*props.target_label_padding)
	      	.outerRadius(radius*props.target_label_padding)
	      	.startAngle(targetAngle)
	     	.endAngle(targetAngle);
	  	var targetLabelLine = g.append('path')
	  		.attr('class', 'targetLabel')
	  		.attr('d', targetLabelArc);
	  	g.append('text')
	  		.attr('class', 'targetValue')
	  		.text(`${props.target_label}`)
	  		.style('font-size', `${props.target_label_font}${limiting_aspect}`)
	  		.style('font-family', 'Arial, Helvetica, sans-serif')
	  		.attr('dy', '.35em')
	  		.attr('x', ()=>{
	  			if (tarNeg > 0) {
	  				return d3.select('.targetLabel').node().getBBox().x;
	  			} else {
	  				return d3.select('.targetLabel').node().getBBox().x - d3.select('.targetValue').node().getBBox().width
	  			}
	  		})
	  		.attr('y', () => {
	  			return d3.select('.targetLabel').node().getBBox().y
	  		});
	  		// .call(wrap, props.wrap_width);
	} else if (props.target_label_type === "nolabel"){
		var target_proportion = mapBetween(props.target,0,1,props.range[0],props.range[1])
	  	var tarNeg = target_proportion < .5 ? -1 : 1;
	  	var target_standard = props.angle*2*target_proportion - props.angle;
	  	var targetAngle = target_standard * Math.PI * 2 / 360;
	  	var targetSpinner = d3.arc()
	      	.innerRadius(cutoutCalc)
	      	.outerRadius(radius)
	      	.startAngle(targetAngle)
	     	.endAngle(targetAngle);
	  	var targetLine = g.append('path')
	  		.attr('class', 'targetSpinner')
	  		.attr('d', targetSpinner)
	  		.attr('stroke', props.target_background)
	  		.attr('stroke-width', props.target_weight/10)
	  		.attr('stroke-dasharray', `${props.target_length} ${props.target_gap}`);
	}
	}
	// console.log(props.value_label)
	// getLabel(props.value_label_type, props.value.rendered, props.value_label, props.value_label_override)
  	// label the value
  	if (props.value_label_type === "value") {
  		g.append('text')
  		.attr('class', 'gaugeValue')
  		.text(`${props.value_rendered}`)
  		.style('font-size', `${props.value_label_font}${limiting_aspect}`)
  		.style('font-family', 'Arial, Helvetica, sans-serif')
  		.style('color', '#282828')
  		.attr('transform', `translate(${0 - d3.select('.gaugeValue').node().getBBox().width/2} ${0 + valueLabelCalc})`);
  	} else if (props.value_label_type === "label") {
  		g.append('text')
  		.attr('class', 'gaugeValueLabel')
  		.text(`${props.value_label}`)
  		.style('font-size', `${props.value_label_font*.55}${limiting_aspect}`)
  		.style('font-family', 'Arial, Helvetica, sans-serif')
  		.style('color', '#707070')
  		.attr('dy', '1em')
  		.attr('transform', `translate(${0 - d3.select('.gaugeValueLabel').node().getBBox().width/2} ${0 + valueLabelCalc})`);
  	} else if (props.value_label_type === "both") {
  		g.append('text')
  		.attr('class', 'gaugeValue')
  		.text(`${props.value_rendered}`)
  		.style('font-size', `${props.value_label_font}${limiting_aspect}`)
  		.style('font-family', 'Arial, Helvetica, sans-serif')
  		.style('color', '#282828')
  		.attr('transform', `translate(${0 - d3.select('.gaugeValue').node().getBBox().width/2} ${0 + valueLabelCalc})`);
  		g.append('text')
  		.attr('class', 'gaugeValueLabel')
  		.text(`${props.value_label}`)
  		.style('font-size', `${props.value_label_font*.55}${limiting_aspect}`)
  		.style('font-family', 'Arial, Helvetica, sans-serif')
  		.style('color', '#707070')
  		.attr('dy', '1.2em')
  		.attr('transform', `translate(${0 - d3.select('.gaugeValueLabel').node().getBBox().width/2} ${0 + valueLabelCalc})`);
  	} else if (props.value_label_type === "dim") {
  		g.append('text')
  		.attr('class', 'gaugeValueLabel')
  		.text(`${props.value_dimension}`)
  		.style('font-size', `${props.value_label_font*.55}${limiting_aspect}`)
  		.style('font-family', 'Arial, Helvetica, sans-serif')
  		.style('color', '#707070')
  		.attr('dy', '1em')
  		.attr('transform', `translate(${0 - d3.select('.gaugeValueLabel').node().getBBox().width/2} ${0 + valueLabelCalc})`);
  	} else if (props.value_label_type === "dboth") {
  		g.append('text')
  		.attr('class', 'gaugeValue')
  		.text(`${props.value_rendered}`)
  		.style('font-size', `${props.value_label_font}${limiting_aspect}`)
  		.style('font-family', 'Arial, Helvetica, sans-serif')
  		.style('color', '#282828')
  		.attr('transform', `translate(${0 - d3.select('.gaugeValue').node().getBBox().width/2} ${0 + valueLabelCalc})`);
  		g.append('text')
  		.attr('class', 'gaugeValueLabel')
  		.text(`${props.value_dimension}`)
  		.style('font-size', `${props.value_label_font*.55}${limiting_aspect}`)
  		.style('font-family', 'Arial, Helvetica, sans-serif')
  		.style('color', '#707070')
  		.attr('dy', '1.2em')
  		.attr('transform', `translate(${0 - d3.select('.gaugeValueLabel').node().getBBox().width/2} ${0 + valueLabelCalc})`);
  	}
  	d3.select(".gaugeValue").on("click", function(d,i) {
			LookerCharts.Utils.openDrillMenu({
	 			links: props.value_links,
	 			event: event
 			});
		})
  	d3.select(".gaugeValueLabel").on("click", function(d,i) {
			LookerCharts.Utils.openDrillMenu({
	 			links: props.value_links,
	 			event: event
 			});
		})
  	let wSca = props.w*.85 / g.node().getBBox().width;
  	let hSca = props.h*.85 / g.node().getBBox().height;
  	// console.log(wSca, hSca)
  	g.attr('transform', `scale(${Math.min(wSca, hSca)})translate(0 ${(props.h - g.node().getBBox().height)/4})`);
  	 // .attr('preserveAspectRatio', 'xMidYMid meet');
}

export default RadialGauge