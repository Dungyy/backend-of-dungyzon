import request from "request-promise";

const fetchData = async (url) => {
  try {
    const response = await request(url);
    return JSON.parse(response);
  } catch (error) {
    console.error("Error fetching data:", error);
    throw new Error("Failed to fetch data");
  }
};

export default fetchData;
