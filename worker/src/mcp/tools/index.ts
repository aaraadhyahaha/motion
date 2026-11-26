// #mcp Tool registry — one file per tool; order = order in tools/list.
import complete_task from './complete_task';
import create_list from './create_list';
import create_task from './create_task';
import delete_task from './delete_task';
import get_agenda from './get_agenda';
import get_task from './get_task';
import list_lists from './list_lists';
import list_tags from './list_tags';
import list_tasks from './list_tasks';
import quick_add from './quick_add';
import reschedule_task from './reschedule_task';
import search_tasks from './search_tasks';
import update_task from './update_task';

export const tools = [
  get_agenda,
  list_tasks,
  search_tasks,
  get_task,
  quick_add,
  create_task,
  update_task,
  reschedule_task,
  complete_task,
  delete_task,
  list_lists,
  create_list,
  list_tags,
];
