const schedule = {
  default: "*/5 * * * * *",
  daily: "0 0 0 * * *"
};

const washers: any[] = [];

washers.forEach(w => (w.id = w.id || w.name));

export = washers;
