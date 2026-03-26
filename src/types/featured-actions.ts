export interface FeaturedAction {
  id: string;
  description: string;
  date: string;
  needle_score: number;
  days_ago: number;
  score: number;
  linked_push_names: string[];
  linked_objective_names: string[];
}
