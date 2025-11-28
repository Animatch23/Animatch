const tasks = [];

const schedule = (expression, handler, options = {}) => {
  let status = "stopped";
  const task = {
    expression,
    handler,
    options,
    start() {
      status = "scheduled";
      return this;
    },
    stop() {
      status = "stopped";
      return this;
    },
    getStatus() {
      return status;
    }
  };

  tasks.push(task);
  return task;
};

const nodeCronMock = {
  schedule,
  __getScheduledTasks: () => tasks,
  __reset: () => {
    tasks.length = 0;
  }
};

module.exports = nodeCronMock;
module.exports.default = nodeCronMock;
module.exports.schedule = schedule;
module.exports.__getScheduledTasks = nodeCronMock.__getScheduledTasks;
module.exports.__reset = nodeCronMock.__reset;
