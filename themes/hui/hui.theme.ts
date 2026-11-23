// The hui theme. `astryx experimental theme editor` wrote this file once and never changes it again.
// The checked settings live in hui.settings.json and the generated hui.settings.ts;
// change them with `astryx experimental theme editor set hui ...`. Add your own changes below: they win over the settings.
import {defineTheme} from '@astryxdesign/core/theme';
import {huiSettings} from './hui.settings';

export const huiTheme = defineTheme({
  extends: huiSettings,
  name: 'hui',
});
