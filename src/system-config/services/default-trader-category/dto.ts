export class CreateDefaultTraderCategoryDto {
  name: string;
  notes?: string;
}

export class UpdateDefaultTraderCategoryDto {
  name?: string;
  notes?: string;
}

export class CreateDefaultTraderCategoryShareDto {
  traderId: number;
  percent: number;
}

export class UpdateDefaultTraderCategoryShareDto {
  percent: number;
}

