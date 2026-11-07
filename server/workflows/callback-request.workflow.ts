// A workflow of the site's back-end: plain data, run by ./runtime.ts.
// Edited from the Workflows tab; when written by hand, keep this exact shape.
import type { Workflow } from "./runtime.js";

export default {
  "format": 1,
  "name": "callback-request",
  "label": "Call-back request",
  "nodes": [
    {
      "id": "trigger",
      "kind": "trigger.form",
      "position": {
        "x": 0,
        "y": 0
      },
      "config": {
        "path": "/callback",
        "fields": [
          {
            "name": "name",
            "type": "text",
            "required": true
          },
          {
            "name": "phone",
            "type": "text",
            "required": true
          },
          {
            "name": "interest",
            "type": "text",
            "required": false
          }
        ]
      }
    },
    {
      "id": "save",
      "kind": "data.create",
      "position": {
        "x": 280,
        "y": 0
      },
      "config": {
        "model": "CallbackRequest",
        "values": [
          {
            "field": "name",
            "value": {
              "type": "field",
              "node": "trigger",
              "path": "body.name"
            }
          },
          {
            "field": "phone",
            "value": {
              "type": "field",
              "node": "trigger",
              "path": "body.phone"
            }
          },
          {
            "field": "interest",
            "value": {
              "type": "field",
              "node": "trigger",
              "path": "body.interest"
            }
          }
        ]
      }
    },
    {
      "id": "notify",
      "kind": "action.notifyOwner",
      "position": {
        "x": 560,
        "y": 0
      },
      "config": {
        "subject": {
          "type": "text",
          "value": "New call-back request"
        },
        "message": {
          "type": "template",
          "parts": [
            "A visitor asked to be called back.\n\nName: ",
            {
              "node": "trigger",
              "path": "body.name"
            },
            "\nPhone: ",
            {
              "node": "trigger",
              "path": "body.phone"
            },
            "\nInterest: ",
            {
              "node": "trigger",
              "path": "body.interest"
            }
          ]
        }
      }
    },
    {
      "id": "done",
      "kind": "action.respond",
      "position": {
        "x": 840,
        "y": 0
      },
      "config": {
        "status": 201,
        "fields": [
          {
            "name": "ok",
            "value": {
              "type": "boolean",
              "value": true
            }
          }
        ]
      }
    }
  ],
  "edges": [
    {
      "from": "trigger",
      "port": "next",
      "to": "save"
    },
    {
      "from": "save",
      "port": "next",
      "to": "notify"
    },
    {
      "from": "notify",
      "port": "next",
      "to": "done"
    }
  ]
} satisfies Workflow;
