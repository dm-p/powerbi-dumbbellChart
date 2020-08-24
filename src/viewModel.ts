import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;

import { VisualSettings } from './settings';

import * as d3Scale from 'd3-scale';

/**
 * Shared axis properties.
 */
    interface IAxis {
        // Physical range of the axis (start and end)
            range: [number, number];
        // X/Y coordinates for SVG translation of enclosing group
            translate: ICoordinates;
    }

/**
 * Properties specific to the value axis.
 */
    interface IValueAxis extends IAxis {
        // Axis domain values
            domain: [number, number];
        // Scale to generate axis from domain and range
            scale: d3Scale.ScaleLinear<number, number>;
        // Tick count (number of ticks to apply)
            tickCount: number;
        // Tick size (length of each gridline)
            tickSize: number;
    }

/**
 * Properties specific to the category axis.
 */
    interface ICategoryAxis extends IAxis {
        // Category domain values
            domain: string[];
        // Scale to generate axis from domain and range
            scale: d3Scale.ScaleBand<string>;
    }

/**
 * Generic interface we can use to store x/y coordinates.
 */
    interface ICoordinates {
        x: number;
        y: number;
    }

/**
 * Used to specify the visual margin values.
 */
    interface IMargin {
        // Pixels to leave at the top
            top: number;
        // Pixels to leave to the right
            right: number;
        // Pixels to leave at the bottom
            bottom: number;
        // Pixels to leave to the left
            left: number;
    }

/**
 * Represents a data point within a visual category.
 */
    export interface IGroup {
        // Name of group
            name: string;
        // Data point value
            value: number;
        // Data point color
            color: string;
    }

/**
 * Represents a visual category data item.
 */
    export interface ICategory {
        // Name of category
            name: string;
        // Maximum group value
            max: number;
        // Minimum group value
            min: number;
        // Category group items
            groups: IGroup[];
    }

/**
 * Visual view model.
 */
    interface IViewModel {
        // Visual margin values
            margin: IMargin;
        // Visual category data items
            categories: ICategory[];
        // Parsed visual settings
            settings: VisualSettings;
        // Category axis information
            categoryAxis: ICategoryAxis;
        // Value axis information
            valueAxis: IValueAxis;
    }

/**
 * Create a view model of static data we can use to prototype our visual's look.
 *
 * @param settings  - parsed visual settings.
 */
    export function mapViewModel(settings: VisualSettings, viewport: IViewport): IViewModel {

        // Assign our margin values so we can re-use them more easily
            const margin = {
                top: 10,
                right: 10,
                bottom: 25,
                left: 75
            };

        // Value axis domain (min/max)
            const valueAxisDomain: [number, number] = [6, 20];

        // Category axis domain (unique values)
            const categoryAxisDomain = [
                'Category A',
                'Category B',
                'Category C',
                'Category D'
            ];

        // Derived range for the value axis, based on margin values
            const valueAxisRange: [number, number] = [
                margin.left,
                viewport.width - margin.right
            ];

        // Derived range for the category axis, based on margin values
            const categoryAxisRange: [number, number] = [
                margin.top,
                viewport.height - margin.bottom
            ];

        // View model
            return {
                margin: margin,
                categoryAxis: {
                    range: categoryAxisRange,
                    domain: categoryAxisDomain,
                    scale: d3Scale.scaleBand()
                        .domain(categoryAxisDomain)
                        .range(categoryAxisRange)
                        .padding(0.2),
                    translate: {
                        x: margin.left,
                        y: 0
                    }
                },
                valueAxis: {
                    range: valueAxisRange,
                    domain: valueAxisDomain,
                    scale: d3Scale.scaleLinear()
                        .domain(valueAxisDomain)
                        .range(valueAxisRange)
                        .nice(),
                    translate: {
                        x: 0,
                        y: viewport.height - margin.bottom
                    },
                    tickCount: 3,
                    tickSize: - viewport.height - margin.top - margin.bottom
                },
                categories: [
                    {
                        name: 'Category A',
                        groups: [
                            { name: 'Group One', value: 6, color: '#118DFF' },
                            { name: 'Group Two', value: 14, color: '#E66C37' }
                        ],
                        max: 14,
                        min: 6
                    },
                    {
                        name: 'Category B',
                        groups: [
                            { name: 'Group One', value: 6, color: '#118DFF' },
                            { name: 'Group Two', value: 14, color: '#E66C37' }
                        ],
                        max: 14,
                        min: 6
                    },
                    {
                        name: 'Category C',
                        groups: [
                            { name: 'Group One', value: 20, color: '#118DFF' },
                            { name: 'Group Two', value: 12, color: '#E66C37' }
                        ],
                        max: 20,
                        min: 12
                    },
                    {
                        name: 'Category D',
                        groups: [
                            { name: 'Group One', value: 18, color: '#118DFF' },
                            { name: 'Group Two', value: 7, color: '#E66C37' }
                        ],
                        max: 18,
                        min: 7
                    }
                ],
                settings: settings
            }
    }