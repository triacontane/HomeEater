ui.UiFactory.customTypes["ui.MessageBacklog"] = {
  "id": "list",
  "type": "ui.DataScrollView",
  "zIndex": 80000,
  "order": 80001,
  "frame": [0, 0, Graphics.width, Graphics.height],
  "params": {
    "dataSource": $(function() {
      return $dataFields.backlog;
    }),
    "template": {
      "size": [Graphics.width, 200],
      "descriptor": {
        "type": "ui.FreeLayout",
        "frame": [0, 0, Graphics.width, 200],
        "controls": [
          {
            "type": "ui.FreeLayout",
            "frame": [0, 20, Graphics.width / 4, 30],
            "controls": [
              {
                "type": "ui.Text",
                "styles": ["backlogNameText"],
                "frame": [0, 0],
                "margin": [0, 0, 20, 0],
                "sizeToFit": true,
                "alignmentX": "right",
                "zIndex": 82000,
                "formulas": [
                  $(function() {
                    var c, ref;
                    c = $dataFields.backlog[o.parent.parent.index].character;
                    o.text = (ref = c != null ? c.name : void 0) != null ? ref : "";
                    if (c != null ? c.textColor : void 0) {
                      return o.font.color.setFromObject(c.textColor);
                    }
                  })
                ],
                "text": "Name"
              }
            ]
          }, {
            "type": "ui.Text",
            "styles": ["messageText"],
            "frame": [Graphics.width / 4 + 20, 20, Graphics.width * 0.7, 0],
            "sizeToFit": {
              "horizontal": false,
              "vertical": true
            },
            "formatting": true,
            "wordWrap": true,
            "zIndex": 82000,
            "order": 80001,
            "formulas": [
              $(function() {
                return o.visible = !$dataFields.backlog[o.parent.index].isChoice;
              }), $(function() {
                if (!$dataFields.backlog[o.parent.index].isChoice) {
                  return o.text = $dataFields.backlog[o.parent.index].message;
                }
              }), $(function() {
                if ($dataFields.backlog[o.parent.index].isChoice) {
                  return o.text = $dataFields.backlog[o.parent.index].choice.text;
                }
              })
            ],
            "text": ""
          }, {
            "type": "ui.FreeLayout",
            "alignmentX": 1,
            "sizeToFit": true,
            "formulas": [
              $(function() {
                return o.visible = $dataFields.backlog[o.parent.index].isChoice;
              })
            ],
            "controls": [
              {
                "type": "ui.Window",
                "formulas": [
                  $(function() {
                    return o.controls[0].image = "selection";
                  })
                ],
                "frame": [0, 0, 750, 50],
                "margin": [0, 0, 0, 30],
                "zIndex": 4999
              }, {
                "type": "ui.Text",
                "sizeToFit": true,
                "styles": ["regularUIText"],
                "alignmentX": "center",
                "alignmentY": "center",
                "frame": [0, 12],
                "margin": [0, 0, 0, 30],
                "formulas": [
                  $(function() {
                    if ($dataFields.backlog[o.parent.parent.index].isChoice) {
                      return o.text = $dataFields.backlog[o.parent.parent.index].choice.text;
                    }
                  })
                ],
                "zIndex": 5100
              }
            ]
          }
        ],
        "margin": [0, 0, 0, 20]
      }
    }
  },
  "zIndex": 81000
};

ui.UiFactory.customTypes["ui.MessageBacklogBox"] = {
  "type": "ui.FreeLayout",
  "order": 80000,
  "id": "backlog",
  "controls": [
    {
      "type": "ui.Panel",
      "animations2": [
        {
          "event": "onInitialize",
          "flow": [
            {
              "type": "appear",
              "animation": {
                "type": 1
              },
              "duration": 30,
              "wait": true
            }
          ]
        }, {
          "event": "onTerminate",
          "flow": [
            {
              "type": "disappear",
              "animation": {
                "type": 1
              },
              "duration": 30,
              "wait": true
            }
          ]
        }
      ],
      "modal": true,
      "order": 800,
      "style": "backlogMessagePanel",
      "zIndex": 80000,
      "frame": [0, 0, Graphics.width, Graphics.height]
    }, {
      "type": "ui.Panel",
      "animations2": [
        {
          "event": "onInitialize",
          "flow": [
            {
              "type": "appear",
              "animation": {
                "type": 1
              },
              "duration": 30,
              "wait": true
            }
          ]
        }, {
          "event": "onTerminate",
          "flow": [
            {
              "type": "disappear",
              "animation": {
                "type": 1
              },
              "duration": 30,
              "wait": true
            }
          ]
        }
      ],
      "style": "backlogNamePanel",
      "zIndex": 80000,
      "frame": [0, 0, Graphics.width / 4, Graphics.height]
    }, {
      "type": "ui.MessageBacklog"
    }
  ],
  "frame": [0, 0, Graphics.width, Graphics.height]
};

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBWSxDQUFBLG1CQUFBLENBQXpCLEdBQWdEO0VBQzVDLElBQUEsRUFBTSxNQURzQztFQUU1QyxNQUFBLEVBQVEsbUJBRm9DO0VBRzVDLFFBQUEsRUFBVSxLQUhrQztFQUk1QyxPQUFBLEVBQVMsS0FKbUM7RUFLNUMsT0FBQSxFQUFTLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxRQUFRLENBQUMsS0FBaEIsRUFBdUIsUUFBUSxDQUFDLE1BQWhDLENBTG1DO0VBTTVDLFFBQUEsRUFBVTtJQUNOLFlBQUEsRUFBZSxDQUFBLENBQUUsU0FBQTthQUFHLFdBQVcsQ0FBQztJQUFmLENBQUYsQ0FEVDtJQUVOLFVBQUEsRUFBWTtNQUNSLE1BQUEsRUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFWLEVBQWlCLEdBQWpCLENBREE7TUFFUixZQUFBLEVBQWM7UUFDVixNQUFBLEVBQVEsZUFERTtRQUVWLE9BQUEsRUFBUyxDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sUUFBUSxDQUFDLEtBQWhCLEVBQXVCLEdBQXZCLENBRkM7UUFHVixVQUFBLEVBQVk7VUFDUjtZQUNJLE1BQUEsRUFBUSxlQURaO1lBRUksT0FBQSxFQUFTLENBQUMsQ0FBRCxFQUFJLEVBQUosRUFBUSxRQUFRLENBQUMsS0FBVCxHQUFpQixDQUF6QixFQUE0QixFQUE1QixDQUZiO1lBR0ksVUFBQSxFQUFZO2NBQ1I7Z0JBQ0ksTUFBQSxFQUFRLFNBRFo7Z0JBRUksUUFBQSxFQUFVLENBQUMsaUJBQUQsQ0FGZDtnQkFHSSxPQUFBLEVBQVMsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUhiO2dCQUlJLFFBQUEsRUFBVSxDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sRUFBUCxFQUFXLENBQVgsQ0FKZDtnQkFLSSxXQUFBLEVBQWEsSUFMakI7Z0JBTUksWUFBQSxFQUFjLE9BTmxCO2dC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UjtNQUNJLE1BQUEsRUFBUSxtQkFEWjtLQTNDUTtHQUptQztFQW9EL0MsT0FBQSxFQUFTLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxRQUFRLENBQUMsS0FBaEIsRUFBdUIsUUFBUSxDQUFDLE1BQWhDLENBcERzQyIsInNvdXJjZXNDb250ZW50IjpbInVpLlVpRmFjdG9yeS5jdXN0b21UeXBlc1tcInVpLk1lc3NhZ2VCYWNrbG9nXCJdID0ge1xuICAgIFwiaWRcIjogXCJsaXN0XCIsXG4gICAgXCJ0eXBlXCI6IFwidWkuRGF0YVNjcm9sbFZpZXdcIixcbiAgICBcInpJbmRleFwiOiA4MDAwMCxcbiAgICBcIm9yZGVyXCI6IDgwMDAxLFxuICAgIFwiZnJhbWVcIjogWzAsIDAsIEdyYXBoaWNzLndpZHRoLCBHcmFwaGljcy5oZWlnaHRdLFxuICAgIFwicGFyYW1zXCI6IHsgXG4gICAgICAgIFwiZGF0YVNvdXJjZVwiOiAoJCAtPiAkZGF0YUZpZWxkcy5iYWNrbG9nKSxcbiAgICAgICAgXCJ0ZW1wbGF0ZVwiOiB7IFxuICAgICAgICAgICAgXCJzaXplXCI6IFtHcmFwaGljcy53aWR0aCwgMjAwXSxcbiAgICAgICAgICAgIFwiZGVzY3JpcHRvclwiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwidWkuRnJlZUxheW91dFwiLFxuICAgICAgICAgICAgICAgIFwiZnJhbWVcIjogWzAsIDAsIEdyYXBoaWNzLndpZHRoLCAyMDBdLFxuICAgICAgICAgICAgICAgIFwiY29udHJvbHNcIjogW1xuICAgICAgICAgICAgICAgICAgICB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwidWkuRnJlZUxheW91dFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJmcmFtZVwiOiBbMCwgMjAsIEdyYXBoaWNzLndpZHRoIC8gNCwgMzBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJjb250cm9sc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwidWkuVGV4dFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInN0eWxlc1wiOiBbXCJiYWNrbG9nTmFtZVRleHRcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZnJhbWVcIjogWzAsIDBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1hcmdpblwiOiBbMCwgMCwgMjAsIDBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInNpemVUb0ZpdFwiOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImFsaWdubWVudFhcIjogXCJyaWdodFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInpJbmRleFwiOiA4MjAwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJmb3JtdWxhc1wiOiBbJCAtPiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGMgPSAkZGF0YUZpZWxkcy5iYWNrbG9nW28ucGFyZW50LnBhcmVudC5pbmRleF0uY2hhcmFjdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvLnRleHQgPSBjPy5uYW1lID8gXCJcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgby5mb250LmNvbG9yLnNldEZyb21PYmplY3QoYy50ZXh0Q29sb3IpIGlmIGM/LnRleHRDb2xvclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInRleHRcIjogXCJOYW1lXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHsgXG4gICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJ1aS5UZXh0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInN0eWxlc1wiOiBbXCJtZXNzYWdlVGV4dFwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZnJhbWVcIjogW0dyYXBoaWNzLndpZHRoIC8gNCArIDIwLCAyMCwgR3JhcGhpY3Mud2lkdGggKiAwLjcsIDBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzaXplVG9GaXRcIjogeyBcImhvcml6b250YWxcIjogZmFsc2UsIFwidmVydGljYWxcIjogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJmb3JtYXR0aW5nXCI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIndvcmRXcmFwXCI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInpJbmRleFwiOiA4MjAwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwib3JkZXJcIjogODAwMDEsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImZvcm11bGFzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkIC0+IG8udmlzaWJsZSA9ICEkZGF0YUZpZWxkcy5iYWNrbG9nW28ucGFyZW50LmluZGV4XS5pc0Nob2ljZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQgLT4gaWYgISRkYXRhRmllbGRzLmJhY2tsb2dbby5wYXJlbnQuaW5kZXhdLmlzQ2hvaWNlIHRoZW4gby50ZXh0ID0gJGRhdGFGaWVsZHMuYmFja2xvZ1tvLnBhcmVudC5pbmRleF0ubWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQgLT4gaWYgJGRhdGFGaWVsZHMuYmFja2xvZ1tvLnBhcmVudC5pbmRleF0uaXNDaG9pY2UgdGhlbiBvLnRleHQgPSAkZGF0YUZpZWxkcy5iYWNrbG9nW28ucGFyZW50LmluZGV4XS5jaG9pY2UudGV4dFxuICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidGV4dFwiOiBcIlwiXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInVpLkZyZWVMYXlvdXRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYWxpZ25tZW50WFwiOiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzaXplVG9GaXRcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZm9ybXVsYXNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQgLT4gby52aXNpYmxlID0gJGRhdGFGaWVsZHMuYmFja2xvZ1tvLnBhcmVudC5pbmRleF0uaXNDaG9pY2VcbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcImNvbnRyb2xzXCI6W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwidWkuV2luZG93XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZm9ybXVsYXNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCAtPiBvLmNvbnRyb2xzWzBdLmltYWdlID0gXCJzZWxlY3Rpb25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImZyYW1lXCI6IFswLCAwLCA3NTAsIDUwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJtYXJnaW5cIjogWzAsIDAsIDAsIDMwXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ6SW5kZXhcIjogNDk5OVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJ1aS5UZXh0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwic2l6ZVRvRml0XCI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwic3R5bGVzXCI6IFtcInJlZ3VsYXJVSVRleHRcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiYWxpZ25tZW50WFwiOiBcImNlbnRlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImFsaWdubWVudFlcIjogXCJjZW50ZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJmcmFtZVwiOiBbMCwgMTJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1hcmdpblwiOiBbMCwgMCwgMCwgMzBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZm9ybXVsYXNcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCAtPiBpZiAkZGF0YUZpZWxkcy5iYWNrbG9nW28ucGFyZW50LnBhcmVudC5pbmRleF0uaXNDaG9pY2UgdGhlbiBvLnRleHQgPSAkZGF0YUZpZWxkcy5iYWNrbG9nW28ucGFyZW50LnBhcmVudC5pbmRleF0uY2hvaWNlLnRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ6SW5kZXhcIjogNTEwMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgXCJtYXJnaW5cIjogWzAsIDAsIDAsIDIwXVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSwgXG4gICAgXCJ6SW5kZXhcIjogODEwMDBcbn1cblxudWkuVWlGYWN0b3J5LmN1c3RvbVR5cGVzW1widWkuTWVzc2FnZUJhY2tsb2dCb3hcIl0gPSB7XG4gICAgXCJ0eXBlXCI6IFwidWkuRnJlZUxheW91dFwiLFxuICAgIFwib3JkZXJcIjogODAwMDAsXG4gICAgXCJpZFwiOiBcImJhY2tsb2dcIixcbiAgICBcImNvbnRyb2xzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwidWkuUGFuZWxcIixcbiAgICAgICAgICAgIFwiYW5pbWF0aW9uczJcIjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJldmVudFwiOiBcIm9uSW5pdGlhbGl6ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImZsb3dcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgeyBcInR5cGVcIjogXCJhcHBlYXJcIiwgXCJhbmltYXRpb25cIjogeyBcInR5cGVcIjogMSB9LCBcImR1cmF0aW9uXCI6IDMwLCBcIndhaXRcIjogdHJ1ZSB9XG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJldmVudFwiOiBcIm9uVGVybWluYXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZmxvd1wiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICB7IFwidHlwZVwiOiBcImRpc2FwcGVhclwiLCBcImFuaW1hdGlvblwiOiB7IFwidHlwZVwiOiAxIH0sIFwiZHVyYXRpb25cIjogMzAsIFwid2FpdFwiOiB0cnVlIH1cbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBcIm1vZGFsXCI6IHRydWUsXG4gICAgICAgICAgICBcIm9yZGVyXCI6IDgwMCxcbiAgICAgICAgICAgIFwic3R5bGVcIjogXCJiYWNrbG9nTWVzc2FnZVBhbmVsXCIsXG4gICAgICAgICAgICBcInpJbmRleFwiOiA4MDAwMCxcbiAgICAgICAgICAgIFwiZnJhbWVcIjogWzAsIDAsIEdyYXBoaWNzLndpZHRoLCBHcmFwaGljcy5oZWlnaHRdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcInVpLlBhbmVsXCIsXG4gICAgICAgICAgICBcImFuaW1hdGlvbnMyXCI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiZXZlbnRcIjogXCJvbkluaXRpYWxpemVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJmbG93XCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgXCJ0eXBlXCI6IFwiYXBwZWFyXCIsIFwiYW5pbWF0aW9uXCI6IHsgXCJ0eXBlXCI6IDEgfSwgXCJkdXJhdGlvblwiOiAzMCwgXCJ3YWl0XCI6IHRydWUgfVxuICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiZXZlbnRcIjogXCJvblRlcm1pbmF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICBcImZsb3dcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgeyBcInR5cGVcIjogXCJkaXNhcHBlYXJcIiwgXCJhbmltYXRpb25cIjogeyBcInR5cGVcIjogMSB9LCBcImR1cmF0aW9uXCI6IDMwLCBcIndhaXRcIjogdHJ1ZSB9XG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgXCJzdHlsZVwiOiBcImJhY2tsb2dOYW1lUGFuZWxcIixcbiAgICAgICAgICAgIFwiekluZGV4XCI6IDgwMDAwLFxuICAgICAgICAgICAgXCJmcmFtZVwiOiBbMCwgMCwgR3JhcGhpY3Mud2lkdGggLyA0LCBHcmFwaGljcy5oZWlnaHRdXG4gICAgICAgIH0sXG4gICAgICAgIHsgXG4gICAgICAgICAgICBcInR5cGVcIjogXCJ1aS5NZXNzYWdlQmFja2xvZ1wiXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgXSxcbiAgICBcImZyYW1lXCI6IFswLCAwLCBHcmFwaGljcy53aWR0aCwgR3JhcGhpY3MuaGVpZ2h0XVxufSJdfQ==
//# sourceURL=Template_MessageBacklog_35.js