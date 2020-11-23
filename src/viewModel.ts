import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import DataView = powerbi.DataView;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionId = powerbi.visuals.ISelectionId;
import { dataViewObject } from 'powerbi-visuals-utils-dataviewutils';
import getFillColorByPropertyName = dataViewObject.getFillColorByPropertyName;
import { interactivitySelectionService } from 'powerbi-visuals-utils-interactivityutils';
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import { valueFormatter, textMeasurementService, interfaces } from 'powerbi-visuals-utils-formattingutils';
import IValueFormatter = valueFormatter.IValueFormatter;
import TextProperties = interfaces.TextProperties;

import { VisualSettings } from './settings';

import * as d3Scale from 'd3-scale';

/**
 * Used to specify the orientation of an axis (and give structure to capabilities/properties)
 */
    export type AxisOrientation = 'left' | 'bottom';

/**
 * Shared axis properties.
 */
    interface IAxis {
        // Physical range of the axis (start and end)
            range: [number, number];
        // X/Y coordinates for SVG translation of enclosing group
            translate: ICoordinates;
        // Tick text properties
            tickTextProperties: TextProperties;
        // Largest measured tick label height & width
            tickLabelDimensions: IViewport;
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
        // Formatter for axis tick values
            tickFormatter: IValueFormatter;
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
 * Provides common functionality for data points within our visual.
 */
    export interface VisualDataPoint extends SelectableDataPoint {
        // Indicates whether data point is highlighed or not
            highlighted: boolean;
    }

/**
 * Base functionality for groups and group/data points
 */
    export interface IGroupBase extends VisualDataPoint {
        // Name of group
            name: string;
        // Group color
            color: string;
        // Group selection ID (for data-bound properties)
            groupSelectionId: ISelectionId;
        // Data point value
            value: number;
        // Highlighted value (if applicable)
            highlightedValue?: number;
    }

/**
 * Represents a data point within a visual category.
 */
    export interface IGroupDataPoint extends IGroupBase {
        // Name of group
            name: string;
        // Group selection ID (for unique values of series)
            groupSelectionId: ISelectionId;
        // Data point selection ID (intersection of category/series/measure)
            dataPointSelectionId: ISelectionId;
        // Data point color
            color: string;
        // Default tooltip data
            tooltipData: VisualTooltipDataItem[];
        // Formatted measure value
            valueFormatted: string;
        // Formatted highlight value (if applicable)
            highlightedValueFormatted?: string;
    }

/**
 * Represents a visual category data item.
 */
    export interface ICategory extends VisualDataPoint {
        // Name of category
            name: string;
        // Maximum group value
            max: number;
        // Minimum group value
            min: number;
        // Category selection ID
            selectionId: ISelectionId;
        // Category group items
            groups: IGroupDataPoint[];
    }

/**
 * Visual view model.
 */
    export interface IViewModel {
        // Indicates that visual is safe to render
            isValid: boolean;
        // Main measure's format string
            primaryFormatString?: string;
        // Visual margin values
            margin: IMargin;
        // Distinct groups/series in the visual data
            groups: IGroupBase[];
        // Visual category data items
            categories: ICategory[];
        // Parsed visual settings
            settings: VisualSettings;
        // Category axis information
            categoryAxis: ICategoryAxis;
        // Value axis information
            valueAxis: IValueAxis;
        // Minimum value for our measure axis
            minValue: number;
        // Maximum value for our measure axis
            maxValue: number;
        // Whether selection is applied to the visual (extracted prior to re-mapping, and updated from BehaviorManager after that)
            hasSelection: boolean;
        // Whether highlights have been applied to the dataView
            hasHighlights: boolean;
        // Determine if we should dim a data point based on selection/highlight status
            shouldDimPoint (dataPoint: VisualDataPoint): boolean;
        // Determine if we should emphazise (embolden) a textual data point based on selection/highlight status
            shouldEmphasizePoint (dataPoint: VisualDataPoint): boolean;
    }

/**
 * Used to maintain the state of the visual ViewModel
 */
    export class ViewModelManager {
        
        // Visual viewModel
            viewModel: IViewModel = this.getNewViewModel();
        // Visual host services
            private host: IVisualHost;
        // Generic margin padding
            private static MarginPad = 15;
        // Category column metadata
            private categoryColumn: powerbi.DataViewCategoryColumn;
        // Grouped values from the dataView
            private valueGroupings: powerbi.DataViewValueColumns;

            constructor(host: IVisualHost) {
                this.host = host;
            }

        /**
         * Update the class properties that hold the objects of interest from the dataView
         *
         * @param dataView  - dataView from update options
         */
            private updateRoleMetadata(dataView: DataView) {
                this.categoryColumn = dataView.categorical.categories[0];
                this.valueGroupings = dataView.categorical.values;
            }

        /**
         * For a supplied dataView and settings, map the data from it into the ViewModel.
         * 
         * @param dataView  - dataView from update options
         * @param settings  - parsed visual settings
         */
            mapDataView(dataView: DataView, settings: VisualSettings) {
                // Get any existing selection info prior to re-building
                    const initialSelection = this.getSelectableDataPoints();
                // Declare empty viewModel
                    this.viewModel = this.getNewViewModel(settings);
                // Just in case we didn't pre-validate, check for validity and return an "empty" ViewModel if not
                    this.viewModel.isValid = this.viewModel.isValid = this.isDataViewValid(dataView);
                    if (!this.viewModel.isValid) return;
                // Update metadata
                    this.updateRoleMetadata(dataView);
                // Confirm whether the visual has a selection applied prior to re-build
                    this.viewModel.hasSelection = initialSelection.filter((dp) => dp.selected).length > 0;
                // Check for the presence of highlights in measure values
                    this.viewModel.hasHighlights = this.valueGroupings.filter((vg) => vg.highlights).length > 0;
                // Get the primary measure's format string
                    this.viewModel.primaryFormatString = dataView.metadata.columns
                            .find((c) => c.roles.measure && !c.groupName)?.format ?? settings.dataPoints.formatStringMissing;
                // Traverse each category entry in the data view and map it to our ViewModel. For each category value, we can
                // use its index to access its corresponding entry in each categorical.values grouping and bring it in.
                    this.mapCategoryDataToViewModel(initialSelection);
                // Assign new viewModel
                    this.viewModel = this.viewModel;
            }
        
        /**
         * Enumerate the `cataegories` in the dataView and map the majority of our ViewModel data.
         *
         * @param initialSelection  - all selectable data points to inspect
         */
            private mapCategoryDataToViewModel(initialSelection: interactivitySelectionService.SelectableDataPoint[]) {
                this.categoryColumn.values.forEach((cv, ci) => {
                    // Category name from current array value. Needs tobe cast to string to fit our view model spec.
                        const categoryName = <string>cv;
                    // We need to get the min/max extents of the group values for the category, so we can track this
                    // using variables in this part of the mapping process and will reset when we hit the next category.
                        let categoryMinValue: number,
                            categoryMaxValue: number;
                    // Build our Selection ID for this category
                        const categorySelectionId = this.getCategorySelectionId(ci);
                    // The number of elements in categorical.values = the number of groups in each category. We can iterate
                    // these and use the outer category index to extract the correct value from each group's array.
                        const groups: IGroupDataPoint[] = this.valueGroupings.grouped().map((g, gi) => {
                            // Get our measure column (which is the first values array element)
                                const measure = g.values.find((m) => m.source.roles.measure);
                            // Get any tooltip columns (0..many)
                                const tooltips = g.values.filter((tt) => tt.source.roles.tooltips);
                            // Get group name
                                const groupName = <string>g.name;
                            // Series-level selection ID
                                const groupSelectionId = this.getGroupSelectionId(g);
                            // Data point-level selection ID
                                const dataPointSelectionId = this.getDataPointSelectionId(ci, g, measure);
                            // Manage highlight status for data point
                                const pointHighlighted = this.viewModel.hasHighlights && measure.highlights[ci] !== null;
                            // As we have restricted valid data types in our data roles, we know it's safe to cast it to a number.
                                const groupValue = <number>measure.values[ci];
                                const groupValueFormatted = valueFormatter.format(groupValue, this.viewModel.primaryFormatString,
                                    undefined, this.host.locale);
                            // If our data is cross-highlighted, obtain the highlight value
                                const pointHighlightedValue = pointHighlighted && <number>measure.highlights[ci];
                                const pointHighlightedValueFormatted = valueFormatter.format(pointHighlightedValue,
                                    this.viewModel.primaryFormatString, undefined, this.host.locale);
                            // Set group min/max to measure value if it's at the extremes
                                categoryMinValue = Math.min(categoryMinValue || groupValue, groupValue);
                                categoryMaxValue = Math.max(categoryMaxValue || groupValue, groupValue);
                            // Handle colour selection. Look in the grouped objects, or using the host services to access 
                            // the report's color palette and assign a color by name.
                                const color = getFillColorByPropertyName(g.objects?.dataPoints,'fillColor',
                                    this.host.colorPalette.getColor(groupName).value);
                            // Add tooltip data
                                let tooltipData = this.getTooltipData(categoryName, groupName, measure, groupValueFormatted,
                                    color, pointHighlighted, pointHighlightedValueFormatted, tooltips, ci);
                            // On the first pass through categories, make sure that our distinct group list is populated
                                if (ci === 0) {
                                    // Manage highlight status for group/data label
                                        const groupHighlighted = this.viewModel.hasHighlights &&
                                                measure.highlights.filter((h) => h !== null).length === measure.highlights.length;
                                    this.viewModel.groups.push({
                                        name: groupName,
                                        color: color,
                                        groupSelectionId: groupSelectionId,
                                        value: groupValue,
                                        identity: groupSelectionId,
                                        selected: this.isSelected(initialSelection, groupSelectionId),
                                        highlighted: groupHighlighted
                                    });
                                }
                            // Return a valid IGroup for this iteration.
                                return {
                                    name: groupName,
                                    groupSelectionId: groupSelectionId,
                                    dataPointSelectionId: dataPointSelectionId,
                                    value: groupValue,
                                    valueFormatted: groupValueFormatted,
                                    highlightedValue: pointHighlightedValue,
                                    highlightedValueFormatted: pointHighlightedValueFormatted,
                                    color: color,
                                    identity: dataPointSelectionId,
                                    selected: this.isSelected(initialSelection, dataPointSelectionId),
                                    tooltipData: tooltipData,
                                    highlighted: pointHighlighted
                                }
                        });
                    // Update the dataset min and max values based on discovered group min/max
                        this.viewModel.minValue = Math.min(this.viewModel.minValue || categoryMinValue, categoryMinValue);
                        this.viewModel.maxValue = Math.max(this.viewModel.maxValue || categoryMaxValue, categoryMaxValue);
                    // Derive the highlight status, based on our logic (only highlight if all data points are also highlighted)
                        const categoryHighlighted = this.viewModel.hasHighlights &&
                                groups.filter((g) => g.highlighted).length === groups.length;
                    // Push the category object into the view model's categories array with the correct properties.
                        this.viewModel.categories.push({
                            name: categoryName,
                            groups: groups,
                            min: categoryMinValue,
                            max: categoryMaxValue,
                            selectionId: categorySelectionId,
                            identity: categorySelectionId,
                            selected: this.isSelected(initialSelection, categorySelectionId),
                            highlighted: categoryHighlighted
                        });
                });
            }

        /**
         * For an array of selectable data points, determine if the specificed selectionId is currently selected or not.
         *
         * @param initialSelection  - all selectable data points to inspect
         * @param selectionId       - selectionId to search for
         */
            private isSelected(
                initialSelection: interactivitySelectionService.SelectableDataPoint[],
                selectionId: ISelectionId
            ): boolean {
                return initialSelection?.find((dp) => selectionId.equals(<ISelectionId>dp.identity))?.selected;
            }

        /**
         * Generate the selectionId for a data point (intersection of category, grouing and measure).
         *
         * @param ci        - current category index
         * @param g         - current column group
         * @param measure   - measure metadata
         */
            private getDataPointSelectionId(ci: number, g: powerbi.DataViewValueColumnGroup, measure: powerbi.DataViewValueColumn) {
                return this.host.createSelectionIdBuilder()
                    .withCategory(this.categoryColumn, ci)
                    .withSeries(this.valueGroupings, g)
                    .withMeasure(measure.source.queryName)
                    .createSelectionId();
            }

        /**
         * Generate a selectionIf from the dataView for the specified column grouping.
         *
         * @param g     - current column group
         */
            private getGroupSelectionId(g: powerbi.DataViewValueColumnGroup) {
                return this.host.createSelectionIdBuilder()
                    .withSeries(this.valueGroupings, g)
                    .createSelectionId();
            }

        /**
         * Generate a selectionId from the dataView for the specified category index.
         *
         * @param ci    - current category index
         */
            private getCategorySelectionId(ci: number) {
                return this.host.createSelectionIdBuilder()
                    .withCategory(this.categoryColumn, ci)
                    .createSelectionId();
            }

        /**
         * For a data point and configuration, construct an array of pertinent tooltip information for it.
         *
         * @param categoryName                      - tooltip category name
         * @param groupName                         - tooltip group/series name
         * @param measure                           - current measure metadata
         * @param groupValueFormatted               - formatted data point value
         * @param color                             - resolved data point color
         * @param pointHighlighted                  - flag to indicate whether data point is currently highlighted
         * @param pointHighlightedValueFormatted    - formatted highlighted value (if data point is highlighted)
         * @param tooltips                          - dataView columns matching the `tooltip` dataRole
         * @param ci                                - current category index (used for extraction from `values` array)
         */
            private getTooltipData(
                categoryName: string,
                groupName: string,
                measure: powerbi.DataViewValueColumn,
                groupValueFormatted: string,
                color: string,
                pointHighlighted: boolean,
                pointHighlightedValueFormatted: string,
                tooltips: powerbi.DataViewValueColumn[],
                ci: number
            ) {
                let tooltipData: VisualTooltipDataItem[] = [
                    {
                        header: `${categoryName} - ${groupName}`,
                        displayName: measure.source.displayName,
                        value: `${groupValueFormatted}`,
                        color: color
                    }
                ];
                // If there's a highlight, we should add that in
                if (pointHighlighted) {
                    tooltipData.push({
                        displayName: 'Highlighted',
                        value: `${pointHighlightedValueFormatted}`,
                        color: color,
                        opacity: '0'
                    });
                }
                // Add any other measure values from the tooltips data role
                tooltips.forEach((tt) => {
                    tooltipData.push({
                        displayName: tt.source.displayName,
                        value: `${valueFormatter.format(
                            tt.values[ci],
                            tt.source.format ?? this.viewModel.settings.dataPoints.formatStringMissing,
                            undefined,
                            this.host.locale
                        )}`,
                        color: color,
                        opacity: '0'
                    });
                });
                return tooltipData;
            }

        /**
         * Traverses the ViewModel for all selectable data points and returns them in a consistent shape for interactivity & behavior.
         */
            getSelectableDataPoints(): SelectableDataPoint[] {
                let dataPoints: SelectableDataPoint[] = [];
                // Category selectors
                this.viewModel.categories.forEach((c) => {
                    dataPoints.push(c);
                    // Data points (category x group)
                    c.groups.forEach((g) => dataPoints.push(g));
                });
                // Distinct group/series selectors
                this.viewModel.groups.forEach((g) => dataPoints.push(g));
                return dataPoints;
            }

        /**
         * For the supplied visual viewport, work out the visual's individual axes for the ViewModel.
         *
         * @param viewport  - viewport (width/height) to constrain visual to
         */
            updateAxes(viewport: IViewport) {
                // Chart orientation (from settings)
                    const orientation = this.viewModel.settings.categoryAxis.orientation;
                // Value axis tick formatter
                    const valueAxisTickFormatter = valueFormatter.create({
                        format: this.viewModel.primaryFormatString,
                        value: this.viewModel.settings.valueAxis.displayUnits || this.viewModel.maxValue,
                        precision: this.viewModel.settings.valueAxis.decimalPlaces,
                        cultureSelector: this.host.locale
                    });
                // Value axis domain (min/max)
                    const valueAxisDomain: [number, number] = [this.viewModel.minValue, this.viewModel.maxValue];
                // Value axis text properties
                    const valueAxisTickTextProperties: TextProperties = {
                        fontFamily: this.viewModel.settings.valueAxis.fontFamily,
                        fontSize: `${this.viewModel.settings.valueAxis.fontSize}pt`
                    };
                    const valueTickLabelDimensions = this.getValueTickLabelDimensions(
                        valueAxisTickTextProperties,
                        valueAxisTickFormatter,
                        valueAxisDomain
                    );
                // Category axis axis text properties
                    const categoryAxisTickTextProperties: TextProperties = {
                        fontFamily: this.viewModel.settings.categoryAxis.fontFamily,
                        fontSize: `${this.viewModel.settings.categoryAxis.fontSize}pt`
                    };
                    const categoryTickLabelDimensions = this.getCategoryTickLabelDimensions(categoryAxisTickTextProperties);
                // Assign our margin values so we can re-use them more easily
                    const margin =
                            this.viewModel.margin =
                            this.calculateMargins(categoryTickLabelDimensions, valueTickLabelDimensions);
                // Category axis domain (unique values)
                    const categoryAxisDomain = this.viewModel.categories.map((c) => c.name);
                // Derived range for the value axis, based on margin values
                    const valueAxisRange: [number, number] = [
                        orientation === 'left' ? margin.left : viewport.height - margin.bottom,
                        orientation === 'left' ? viewport.width - margin.right : margin.top
                    ];
                    const valueAxisTranslate: ICoordinates = {
                        x: orientation === 'left' ? 0 : margin.left,
                        y: orientation === 'left' ? viewport.height - margin.bottom : 0
                    };
                    const valueAxisTickSize =
                        orientation === 'left'
                            ?   - viewport.height - margin.top - margin.bottom
                            :   - viewport.width - margin.right - margin.left;
                // Derived range for the category axis, based on margin values
                    const categoryAxisRange: [number, number] = [
                        orientation === 'left' ? margin.top : margin.left,
                        orientation === 'left' ? viewport.height - margin.bottom :viewport.width - margin.right
                    ];
                    const categoryAxisTranslate: ICoordinates = {
                        x: orientation === 'left' ? margin.left : 0,
                        y: orientation === 'left' ? 0 : viewport.height - margin.bottom
                    };
                // Tick count for value axis
                    const valueAxisTickCount = 3;
                // Set-up category axis
                    this.viewModel.categoryAxis = {
                        range: categoryAxisRange,
                        domain: categoryAxisDomain,
                        scale: d3Scale.scaleBand()
                            .domain(categoryAxisDomain)
                            .range(categoryAxisRange)
                            .padding(orientation === 'left' ? 0 : this.viewModel.settings.categoryAxis.innerPadding / 100),
                        translate: categoryAxisTranslate,
                        tickTextProperties: categoryAxisTickTextProperties,
                        tickLabelDimensions: categoryTickLabelDimensions
                    };
                // Set-up value axis
                    this.viewModel.valueAxis = {
                        range: valueAxisRange,
                        domain: valueAxisDomain,
                        scale: d3Scale.scaleLinear()
                            .domain(valueAxisDomain)
                            .range(valueAxisRange)
                            .nice(valueAxisTickCount),
                        translate: valueAxisTranslate,
                        tickCount: valueAxisTickCount,
                        tickSize: valueAxisTickSize,
                        tickFormatter: valueAxisTickFormatter,
                        tickTextProperties: valueAxisTickTextProperties,
                        tickLabelDimensions: valueTickLabelDimensions
                    };
            }

        /**
         * Creates an 'empty' viewModel, essentially resetting it.
         *
         * @param settings  - parsed visual settings
         */
            private getNewViewModel(settings?: VisualSettings): IViewModel {
                return {
                    isValid: false,
                    margin: this.calculateMargins(),
                    categories: [],
                    groups: [],
                    settings: settings,
                    categoryAxis: null,
                    valueAxis: null,
                    minValue: 0,
                    maxValue: 0,
                    hasSelection: false,
                    hasHighlights: false,
                    shouldDimPoint: (dataPoint: VisualDataPoint) => {
                        switch (true) {
                            case this.viewModel.hasSelection && !dataPoint.selected:
                            case this.viewModel.hasHighlights && !dataPoint.highlighted: {
                                return true;
                            }
                            default: {
                                return false;
                            }
                        }
                    },
                    shouldEmphasizePoint: (dataPoint: VisualDataPoint) => {
                        return dataPoint.selected || false;
                    }
                }
            }

        /**
         * Test the supplied data view to ensure that it's valid for our visual's view model logic.
         *
         * @param dataView  - dataView from update options
         */
            private isDataViewValid(dataView: DataView): boolean {
                if (
                    dataView &&
                    dataView.categorical &&
                    dataView.categorical.categories &&
                    dataView.categorical.categories.length === 1 &&
                    dataView.categorical.values &&
                    dataView.categorical.values.length > 0
                ) {
                    return true;
                }
                return false;
            }

        /**
         * Calculate the largest tick label for the category axis, based on the font and number format
         *
         * @param textProperties    - axis font/text properties
         */
            private getCategoryTickLabelDimensions(
                textProperties: TextProperties
            ): IViewport {
                let maxHeight = 0,
                    maxWidth = 0;
                this.viewModel.categories.forEach((c) => {
                    const
                        height = textMeasurementService.measureSvgTextHeight(textProperties, c.name),
                        width = textMeasurementService.measureSvgTextWidth(textProperties, c.name);
                    maxHeight = Math.max(height, maxHeight);
                    maxWidth = Math.max(width, maxWidth);
                });
                return {
                    height: maxHeight,
                    width: maxWidth
                };
            }

        /**
         * Calculate the largest tick label for the value axis, based on the font and number format.
         *
         * @param textProperties    - axis font/text properties
         * @param domain            - axis domain values
         * @param formatter         - axis number formatter
         */
            private getValueTickLabelDimensions(
                textProperties: TextProperties,
                formatter: IValueFormatter,
                domain: [number, number]
            ): IViewport {
                let maxHeight = 0,
                    maxWidth = 0;
                domain.forEach((d) => {
                    const
                        height = textMeasurementService.measureSvgTextHeight(textProperties, formatter.format(d)),
                        width = textMeasurementService.measureSvgTextWidth(textProperties, formatter.format(d))
                    maxHeight = Math.max(height, maxHeight);
                    maxWidth = Math.max(width, maxWidth);
                });
                return {
                    height: maxHeight,
                    width: maxWidth
                };                
            }

        /**
         * Calculate the visual margins, accounting for calculated tick label dimensions (if available).
         *
         * @param categoryTickLabelDimensions   - calculated largest category axis tick label dimensions
         * @param valueTickLabelDimensions      - calculated largest value axis tick label dimensions
         */
            private calculateMargins(
                categoryTickLabelDimensions?: IViewport,
                valueTickLabelDimensions?: IViewport
            ): IMargin {
                let margin: IMargin = {
                    top: ViewModelManager.MarginPad,
                    right: ViewModelManager.MarginPad,
                    bottom: ViewModelManager.MarginPad,
                    left: ViewModelManager.MarginPad
                };
                if (categoryTickLabelDimensions && valueTickLabelDimensions) {
                    const orientation = this.viewModel.settings.categoryAxis.orientation;
                    margin.bottom += orientation === 'left'
                        ?   valueTickLabelDimensions.height
                        :   categoryTickLabelDimensions.height;
                    margin.left += orientation === 'left'
                        ?   categoryTickLabelDimensions.width
                        :   valueTickLabelDimensions.width;
                    margin.right += orientation === 'left'
                        ?   valueTickLabelDimensions.width / 2
                        :   0;
                }
                return margin;
            }

    }