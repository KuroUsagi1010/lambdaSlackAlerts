const slackUrl = process.env.SLACK_URL;

/**
 * Extract alarm attributes from the SNS message
 */
function getAlarmAttributes(snsMessage) {
  return {
    name: snsMessage.AlarmName,
    description: snsMessage.AlarmDescription,
    reason: snsMessage.NewStateReason,
    region: snsMessage.Region,
    state: snsMessage.NewStateValue,
    previous_state: snsMessage.OldStateValue,
  };
}

/**
 * Slack block templates
 */
function registerAlarm(alarm) {
  return {
    type: "home",
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `:warning: ${alarm.name} alarm was registered` },
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: `_${alarm.description}_` },
        block_id: "text1",
      },
      { type: "divider" },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `Region: *${alarm.region}*` }],
      },
    ],
  };
}

function activateAlarm(alarm) {
  return {
    type: "home",
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `:red_circle: Alarm: ${alarm.name}` },
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: `_${alarm.reason}_` },
        block_id: "text1",
      },
      { type: "divider" },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `Region: *${alarm.region}*` }],
      },
    ],
  };
}

function resolveAlarm(alarm) {
  return {
    type: "home",
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `:large_green_circle: Alarm: ${alarm.name} was resolved` },
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: `_${alarm.reason}_` },
        block_id: "text1",
      },
      { type: "divider" },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `Region: *${alarm.region}*` }],
      },
    ],
  };
}

/**
 * Main Lambda handler
 */
export const handler = async (event) => {
  console.log("Event:", event);
  const snsMessage = JSON.parse(event.Records[0].Sns.Message);
  console.log("SNS Message:", snsMessage);
  const alarm = getAlarmAttributes(snsMessage);

  console.log("Alarm:", alarm);
  let msg = null;

  if (alarm.previous_state === "INSUFFICIENT_DATA" && alarm.state === "OK") {
    console.log("INSUFFICIENT1");
    msg = registerAlarm(alarm);
  } else if ((alarm.previous_state === "OK" || alarm.previous_state === "INSUFFICIENT_DATA") && alarm.state === "ALARM") {
    console.log("ACTIVATE ALARM");
    msg = activateAlarm(alarm);
  } else if (alarm.previous_state === "ALARM" && alarm.state === "OK") {
    console.log("RESOLVED ALARM");
    msg = resolveAlarm(alarm);
  }

  if (msg) {
    console.log("Sending to Slack:");
    try {
      const resp = await fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });

      console.log({
        message: msg,
        status_code: resp.status,
        response: await resp.text(),
      });
    } catch (err) {
      console.error("Error sending to Slack:", err);
    }
  }
};
