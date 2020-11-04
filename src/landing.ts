import powerbi from 'powerbi-visuals-api';
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;

import * as d3Select from 'd3-selection';

    export class LandingPageManager {
        
        // Help URL
            private static HelpUrl = 'https://www.powerbi.com';
        // Confirms landing page should be on
            private enabled: boolean = false;
        // Specifies that the landing page has been removed since being displayed
            private removed: boolean = false;
        // Element to hold all landing page content
            private landingPageContainer: d3.Selection<HTMLDivElement, any, any, any>;
        // Developer visual host services
            private host: IVisualHost;
        // Localization manager (for translations)
            private localizationManager: ILocalizationManager;
            
            constructor(element: HTMLElement, host: IVisualHost) {
                this.host = host;
                this.localizationManager = this.host.createLocalizationManager();
                this.landingPageContainer = d3Select.select(element)
                    .append('div')
                        .attr('id', 'landingPageContainer');
            }

        /**
         * Manage landing page state and trigger content rendering as needed.
         *
         * @param isVmValid     - ViewModel validity flag
         */
            handleDisplay(isVmValid: boolean) {
                if (!isVmValid) {
                    // Only re-generate if enabled state has changed
                        if (!this.enabled) {
                            this.enabled = true;
                            this.generateContent();
                        }
                } else {
                    // Clear all content
                        this.landingPageContainer
                            .selectAll('*')
                                .remove();
                    // Update flags
                        this.removed = this.enabled && !this.removed;
                        this.enabled = false;
                }
            }

        /**
         * Add the necessary content to the landing page container.
         */
            private generateContent() {
                const lm = this.localizationManager;
                // Heading
                    this.landingPageContainer
                        .append('h1')
                            .text(lm.getDisplayName('Landing_Heading'));
                // Overview
                    this.landingPageContainer
                        .append('p')
                            .text(lm.getDisplayName('Landing_Overview'));
                // Hyperlink
                    this.landingPageContainer
                        .append('a')
                            .attr('href', '#')
                            .on('click', () => {
                                this.host.launchUrl(LandingPageManager.HelpUrl);
                            })
                            .text(lm.getDisplayName('Landing_Help'));
            }

    }