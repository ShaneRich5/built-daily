import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Start workout</Button>);
    expect(
      screen.getByRole("button", { name: "Start workout" }),
    ).toBeInTheDocument();
  });

  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Log set</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Log set" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire onClick while disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Finish
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
