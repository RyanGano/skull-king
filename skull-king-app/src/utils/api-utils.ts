import axios, { AxiosError } from "axios";

export const callGetRoute = async (uri: string) => {
  try {
    const result = await axios.get(uri);

    return {
      data: result.data,
      status: result.status,
      statusText: result.statusText,
    };
  } catch (error) {
    const theError = error as AxiosError;

    return {
      status: theError.response?.status,
      statusText: theError.response?.statusText,
    };
  }
};

export const callPostRoute = async (uri: string, postData: JSON) => {
  try {
    const result = await axios.post(uri, postData);

    return {
      data: result.data,
      status: result.status,
      statusText: result.statusText,
    };
  } catch (error) {
    const theError = error as AxiosError;

    if (theError.response?.status === 400) {
      console.log(
        "Post: Bad request",
        { request: postData, response: theError.response?.data },
        uri
      );
    }

    return {
      status: theError.response?.status,
      statusText: theError.response?.statusText,
    };
  }
};

export const callPutRoute = async (uri: string, putData: JSON) => {
  try {
    const result = await axios.put(uri, putData);

    return {
      data: result.data,
      status: result.status,
      statusText: result.statusText,
    };
  } catch (error) {
    const theError = error as AxiosError;

    if (theError.response?.status === 400) {
      console.log(
        "Put: Bad request",
        { request: putData, response: theError.response?.data },
        uri
      );
    }

    return {
      status: theError.response?.status,
      statusText: theError.response?.statusText,
    };
  }
};

export const callDeleteRoute = async (uri: string) => {
  try {
    const result = await axios.delete(uri);

    return {
      data: result.data,
      status: result.status,
      statusText: result.statusText,
    };
  } catch (error) {
    const theError = error as AxiosError;

    return {
      status: theError.response?.status,
      statusText: theError.response?.statusText,
    };
  }
};
