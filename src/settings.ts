/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

'use strict';

import { dataViewObjectsParser } from 'powerbi-visuals-utils-dataviewutils';
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

import { AxisOrientation } from './viewModel';

export class VisualSettings extends DataViewObjectsParser {
    categoryAxis = new CategoryAxisSettings();
    valueAxis = new ValueAxisSettings();
    dataPoints = new DataPointSettings();
    connectingLines = new ConnectingLineSettings();
    dataLabels = new DataLabelSettings();
}

export class AxisSettings {
    // Tick label color
        color: string = '#605E5C';
    // Tick label font size
        fontSize: number = 9;
    // Tick label font family
        fontFamily: string = '"Segoe UI", wf_segoe-ui_normal, helvetica, arial, sans-serif';
}

export class CategoryAxisSettings extends AxisSettings {
    // Specifies orientation of the axis in the visual
        orientation: AxisOrientation = 'left';
    // Inner padding between categories
        innerPadding: number = 20;
}

export class ValueAxisSettings extends AxisSettings {
    // Display units for axis values
        displayUnits: number = 0;
    // Number of decimal places to use for values
        decimalPlaces: number = null;
}

export class DataPointSettings {
    // The size of the radius, in pixels
        radius: number = 5;
    // Number format to use if not defined for measure or tooltip value
        formatStringMissing: string = '#,##0.00';
}

export class ConnectingLineSettings {
    // The width of the line, in pixels
        strokeWidth: number = 2;
    // The color of the line
        color: string = '#605E5C';
}

export class DataLabelSettings {
    // Toggle the data label properties
        show: boolean = true;
}