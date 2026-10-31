import axios, { AxiosError, type AxiosRequestConfig } from "axios";

// Game actions are authorized by the acting player's own secret token, which
// the server checks against this header. See utils/player-token.ts.
export const PlayerTokenHeader = "X-Player-Token";

const withPlayerToken = (
  playerToken?: string,
): AxiosRequestConfig | undefined =>
  playerToken ? { headers: { [PlayerTokenHeader]: playerToken } } : undefined;

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

export const callPostRoute = async (
  uri: string,
  postData?: JSON,
  playerToken?: string,
) => {
  try {
    const result = await axios.post(
      uri,
      postData,
      withPlayerToken(playerToken),
    );

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
        uri,
      );
    }

    return {
      status: theError.response?.status,
      statusText: theError.response?.statusText,
    };
  }
};

export const callPutRoute = async (
  uri: string,
  putData: JSON,
  playerToken?: string,
) => {
  try {
    const result = await axios.put(uri, putData, withPlayerToken(playerToken));

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
        uri,
      );
    }

    return {
      status: theError.response?.status,
      statusText: theError.response?.statusText,
    };
  }
};

export const callDeleteRoute = async (uri: string, playerToken?: string) => {
  try {
    const result = await axios.delete(uri, withPlayerToken(playerToken));

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
