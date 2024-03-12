const COLOR_COMBOS = [
  {
    primary: "#ff4b80",
    secondary: "#fadbde",
  },
  {
    primary: "#492632",
    secondary: "#8d253c",
  },
  {
    primary: "#23697f",
    secondary: "#c4aa7c",
  },
  {
    primary: "#3ab6c6",
    secondary: "#235f6c",
  },
  {
    primary: "#992620",
    secondary: "#f6471c",
  },
  {
    primary: "#fad652",
    secondary: "#256477",
  },
  {
    primary: "#ff7b2f",
    secondary: "#fec449",
  },
  {
    primary: "#809c9e",
    secondary: "#ff3c55",
  },
  {
    primary: "#439a58",
    secondary: "#fa792f",
  },
  {
    primary: "#439a58",
    secondary: "#ffad85",
  },
];

const randomColorCombo = (availableColorCodes) => {
  const randomColorCodeIndex =
    availableColorCodes[Math.floor(Math.random() * availableColorCodes.length)];
  return COLOR_COMBOS[randomColorCodeIndex];
};

export { randomColorCombo, COLOR_COMBOS };
