export type HSG = 'A' | 'B' | 'C' | 'D';

export interface LandUseCategory {
    id: string;
    label: string;
    cn: Record<HSG, number>;
}

export const TR55_CATEGORIES: LandUseCategory[] = [
    {
        id: 'open_space_poor',
        label: 'Open space (lawns, parks) - Poor condition (<50% grass)',
        cn: { A: 68, B: 79, C: 86, D: 89 }
    },
    {
        id: 'open_space_fair',
        label: 'Open space (lawns, parks) - Fair condition (50-75% grass)',
        cn: { A: 49, B: 69, C: 79, D: 84 }
    },
    {
        id: 'open_space_good',
        label: 'Open space (lawns, parks) - Good condition (>75% grass)',
        cn: { A: 39, B: 61, C: 74, D: 80 }
    },
    {
        id: 'impervious',
        label: 'Impervious (paved parking, roofs, driveways)',
        cn: { A: 98, B: 98, C: 98, D: 98 }
    },
    {
        id: 'streets_paved_curb',
        label: 'Streets and roads - Paved with curbs & sewers',
        cn: { A: 98, B: 98, C: 98, D: 98 }
    },
    {
        id: 'streets_paved_ditch',
        label: 'Streets and roads - Paved with open ditches',
        cn: { A: 83, B: 89, C: 92, D: 93 }
    },
    {
        id: 'streets_gravel',
        label: 'Streets and roads - Gravel',
        cn: { A: 76, B: 85, C: 89, D: 91 }
    },
    {
        id: 'streets_dirt',
        label: 'Streets and roads - Dirt',
        cn: { A: 72, B: 82, C: 87, D: 89 }
    },
    {
        id: 'commercial',
        label: 'Urban - Commercial and business',
        cn: { A: 89, B: 92, C: 94, D: 95 }
    },
    {
        id: 'industrial',
        label: 'Urban - Industrial',
        cn: { A: 81, B: 88, C: 91, D: 93 }
    },
    {
        id: 'residential_1_8',
        label: 'Residential - 1/8 acre or less (65% imp)',
        cn: { A: 77, B: 85, C: 90, D: 92 }
    },
    {
        id: 'residential_1_4',
        label: 'Residential - 1/4 acre (38% imp)',
        cn: { A: 61, B: 75, C: 83, D: 87 }
    },
    {
        id: 'residential_1_3',
        label: 'Residential - 1/3 acre (30% imp)',
        cn: { A: 57, B: 72, C: 81, D: 86 }
    },
    {
        id: 'residential_1_2',
        label: 'Residential - 1/2 acre (25% imp)',
        cn: { A: 54, B: 70, C: 80, D: 85 }
    },
    {
        id: 'residential_1',
        label: 'Residential - 1 acre (20% imp)',
        cn: { A: 51, B: 68, C: 79, D: 84 }
    },
    {
        id: 'residential_2',
        label: 'Residential - 2 acres (12% imp)',
        cn: { A: 46, B: 65, C: 77, D: 82 }
    },
    {
        id: 'newly_graded',
        label: 'Developing urban - Newly graded areas',
        cn: { A: 77, B: 86, C: 91, D: 94 }
    },
    {
        id: 'meadow',
        label: 'Agriculture - Meadow (continuous grass)',
        cn: { A: 30, B: 58, C: 71, D: 78 }
    },
    {
        id: 'woods_poor',
        label: 'Woods - Poor (forest litter, small trees, brush)',
        cn: { A: 45, B: 66, C: 77, D: 83 }
    },
    {
        id: 'woods_fair',
        label: 'Woods - Fair (grazed but not burned)',
        cn: { A: 36, B: 60, C: 73, D: 79 }
    },
    {
        id: 'woods_good',
        label: 'Woods - Good (protected from grazing)',
        cn: { A: 30, B: 55, C: 70, D: 77 }
    },
    {
        id: 'pasture_poor',
        label: 'Pasture - Poor (<50% ground cover)',
        cn: { A: 68, B: 79, C: 86, D: 89 }
    },
    {
        id: 'pasture_fair',
        label: 'Pasture - Fair (50-75% ground cover)',
        cn: { A: 49, B: 69, C: 79, D: 84 }
    },
    {
        id: 'pasture_good',
        label: 'Pasture - Good (>75% ground cover)',
        cn: { A: 39, B: 61, C: 74, D: 80 }
    }
];

export function getCn(categoryId: string, hsg: HSG): number {
    const cat = TR55_CATEGORIES.find(c => c.id === categoryId);
    return cat ? cat.cn[hsg] : 0;
}
