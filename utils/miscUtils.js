const COLORS = {
  Brown: "#964910",
  Red: "#ff2f18",
  Orange: "#ff822a",
  Yellow: "#fbdd38",
  LightGreen: "#7ccf9f",
  DarkGreen: "#0d6f64",
  Cyan: "#00bbf2",
  Blue: "#0458b0",
  Indigo: "#394ba7",
  Purple: "#bd58ab",
  Pink: "#fa3198",
  Gray: "#42454b",
};

const randomColor = (availableColors) => {
  const randomColorIndex = Math.floor(Math.random() * availableColors.length);
  return availableColors[randomColorIndex];
};

export { randomColor, COLORS };
