import "bootstrap/dist/css/bootstrap.min.css";
import Button from "react-bootstrap/esm/Button";
import Stack from "react-bootstrap/esm/Stack";
import { useCallback, useRef, useState } from "react";

const App = () => {
  const [value, setValue] = useState(0);
  const [onCall, setOnCall] = useState(false);
  const timerRef = useRef<number | null>(null);
  const incrementRef = useRef<number>(1);

  const updateIncrement = useCallback(() => {
    if (!timerRef?.current) {
      return;
    }

    incrementRef.current = (incrementRef.current % 3) + 1;
  }, []);

  const connect = useCallback(() => {
    if (timerRef?.current) {
      return;
    }

    setValue(0);
    setOnCall(true);

    timerRef.current = setInterval(() => {
      setValue((previousValue) => previousValue + incrementRef.current);
    }, 1000);
  }, []);

  const hangUp = useCallback(() => {
    if (!timerRef?.current) {
      console.log("No call to hang up.");
      return;
    }

    setOnCall(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <Stack gap={2}>
      <span>{`Status: ${onCall ? "Connected" : "Disconnected"} / Increment: ${
        incrementRef.current
      } / Value: ${value}`}</span>
      <Button onClick={connect} disabled={onCall}>
        Dial
      </Button>
      <Button onClick={hangUp} disabled={!onCall}>
        Hang Up
      </Button>
      <Button onClick={updateIncrement} disabled={!onCall}>
        Update (to {(incrementRef.current % 3) + 1})
      </Button>
    </Stack>
  );
};

export default App;

