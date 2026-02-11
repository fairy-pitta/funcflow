/**
 * Simple test fixture for funcflow
 */

function main() {
  processData();
  cleanup();
}

function processData() {
  const data = fetchData();
  transformData(data);
}

function fetchData() {
  return { id: 1, name: "test" };
}

function transformData(data: { id: number; name: string }) {
  return {
    ...data,
    processed: true,
  };
}

function cleanup() {
  // cleanup logic
}

export { main, processData, fetchData, transformData, cleanup };
