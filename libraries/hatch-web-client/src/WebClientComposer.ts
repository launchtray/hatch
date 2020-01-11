import {WebCommonComposition} from '@launchtray/hatch-web';

export interface WebClientComposition extends WebCommonComposition {
}

export type WebClientComposer = () => Promise<WebClientComposition>;
