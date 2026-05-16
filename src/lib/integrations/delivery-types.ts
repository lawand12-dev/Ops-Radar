export type DeliveryTask = {
  id: string;
  name: string;
  status: string;
  due_date: string | null;
  overdue: boolean;
  project_name: string;
  source: 'clickup' | 'asana';
};

export type DeliveryData = {
  active_projects: number;
  overdue_tasks: number;
  tasks: DeliveryTask[];
};
