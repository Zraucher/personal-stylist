// The angles and crops we ask for. The outfit mock-up tool will pick from these.
export type PhotoSlot = { id: string; label: string; hint: string };
export type PhotoGroup = { title: string; slots: PhotoSlot[] };

export const PHOTO_GROUPS: PhotoGroup[] = [
  {
    title: "Full body",
    slots: [
      { id: "full_front", label: "Front", hint: "Head to feet, facing the camera, arms relaxed." },
      { id: "full_side", label: "Side", hint: "Head to feet, turned 90 degrees." },
      { id: "full_back", label: "Back", hint: "Head to feet, facing away." },
      { id: "full_three_quarter", label: "Three-quarter", hint: "Head to feet, turned about 45 degrees." },
    ],
  },
  {
    title: "Waist up",
    slots: [
      { id: "waist_up_front", label: "Front", hint: "Head to waist, facing the camera." },
      { id: "waist_up_side", label: "Side", hint: "Head to waist, turned 90 degrees." },
      { id: "waist_up_back", label: "Back", hint: "Head to waist, facing away." },
    ],
  },
  {
    title: "Waist down",
    slots: [
      { id: "waist_down_front", label: "Front", hint: "Waist to feet, facing the camera." },
      { id: "waist_down_side", label: "Side", hint: "Waist to feet, turned 90 degrees." },
      { id: "waist_down_back", label: "Back", hint: "Waist to feet, facing away." },
    ],
  },
  {
    title: "Shoulders up",
    slots: [
      { id: "shoulders_up_front", label: "Front", hint: "Head and shoulders, facing the camera." },
      { id: "shoulders_up_side", label: "Side", hint: "Head and shoulders, in profile." },
    ],
  },
  {
    title: "Other",
    slots: [
      { id: "feet", label: "Feet and shoes", hint: "Standing, shot from above or the side." },
      { id: "other_1", label: "Other angle 1", hint: "Anything else you want the tool to have." },
      { id: "other_2", label: "Other angle 2", hint: "Anything else you want the tool to have." },
    ],
  },
];

export const ALL_SLOT_IDS: string[] = PHOTO_GROUPS.flatMap((g) => g.slots.map((s) => s.id));
