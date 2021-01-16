import {WebCommonComposition} from '@launchtray/hatch-web';

export type WebClientComposition = WebCommonComposition

export type WebClientComposer = () => Promise<WebClientComposition>;
