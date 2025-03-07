import { PanelExtensionContext, RenderState, Topic, MessageEvent } from "@foxglove/studio";
import { useLayoutEffect, useEffect, useState } from "react";
import ReactDOM from "react-dom";

const teleopStyles = {
  box: {
    display: "flex",
    "flex-direction": "column",
    "justify-content": "space-between",
    "align-items": "center",
    width: "100%",
    height: "100%",
    margin: "10px",
  },
  button: {
    width: "200px",
    height: "75px",
    "border-radius": "10px",
    margin: "10px",
  },
  control: {
    maxHeight: "100%",
    maxWidth: "100%",
  },
  selected: {
    "background-color": "#9480ED",
  }
};

const message = {data: "pose"};
let intervalHandlers: NodeJS.Timer[] = [];

function MushrTeleop({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [topics, setTopics] = useState<readonly Topic[] | undefined>();
  const [messages, setMessages] = useState<readonly MessageEvent<unknown>[] | undefined>();

  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  const [poseStyle, setPoseStyle] = useState<Object>({...teleopStyles.button, ...teleopStyles.selected});
  const [goalStyle, setGoalStyle] = useState<Object>({...teleopStyles.button});
  const [estimateStyle, setEstimateStyle] = useState<Object>({...teleopStyles.button});

  useLayoutEffect(() => {
   
    context.onRender = (renderState: RenderState, done) => {
    
      setRenderDone(() => done);

      setTopics(renderState.topics);

      setMessages(renderState.currentFrame);
    };

    context.watch("topics");

    context.watch("currentFrame");

    const publishRate = 1000; // publish at 1 hz

    // clear intervals in case refresh happens too quickly
    intervalHandlers.forEach(intervalHandle => {
      clearInterval(intervalHandle);
    });

    intervalHandlers = [];

    const intervalHandle = setInterval(() => {
      context.advertise?.("/foxglove/click_type", "std_msgs/String");
      context.publish?.("/foxglove/click_type", message);
    }, publishRate);

    intervalHandlers.push(intervalHandle);

    return () => {
      clearInterval(intervalHandle);

    };
  }, []);

  // invoke the done callback once the render is complete
  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  const canPublish = context.publish != undefined;
  function setMessageValue(value: string) {
    message.data = value;
    if (value === "pose") {
      setPoseStyle({...teleopStyles.button, ...teleopStyles.selected});
      setGoalStyle({...teleopStyles.button});
      setEstimateStyle({...teleopStyles.button});
    } else if (value === "goal") {
      setPoseStyle({...teleopStyles.button});
      setGoalStyle({...teleopStyles.button, ...teleopStyles.selected});
      setEstimateStyle({...teleopStyles.button});
    } else if (value === "estimate") {
      setPoseStyle({...teleopStyles.button});
      setGoalStyle({...teleopStyles.button});
      setEstimateStyle({...teleopStyles.button, ...teleopStyles.selected});
    }
  }
  return (
    <>
      <div>
        {!canPublish &&
          (
            <div>
              <div>Error publishing to ROSBRIDGE</div>
              <div>{topics?.join(",")}</div>
              <div>{messages?.length}</div>
            </div>
          )
        }
        {canPublish &&
          (<div style={teleopStyles.box}>
            <button 
              style={poseStyle}
              onClick={() => {
                setMessageValue("pose");
              }}
            >
                Set Pose
            </button>
            <button 
              style={estimateStyle}
              onClick={() => {
                setMessageValue("estimate");
              }}
            >
              Set Pose Estimate</button>
            <button 
              style={goalStyle}
              onClick={() => {
                setMessageValue("goal");
              }}
            >
              Set Goal</button>
          </div>)
        }
      </div>
    </>
  );
}

export function initMushrTeleop(context: PanelExtensionContext) {
  ReactDOM.render(<MushrTeleop context={context} />, context.panelElement);
}
