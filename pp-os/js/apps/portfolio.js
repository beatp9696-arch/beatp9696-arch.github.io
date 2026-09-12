import {mountWorkspace} from '../features/living-thesis/workspace.js';
import {researchIcon} from '../core/research-store.js';

export default {
  id:'portfolio', name:'Portfolio', icon:researchIcon('activity'),
  defaultSize:{w:1180,h:820},
  mount:mountWorkspace,
};
