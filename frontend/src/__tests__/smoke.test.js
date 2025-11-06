import { render } from "@testing-library/react";
import Home from "../app/page.js";
test("renders Home component", () => {
  const { getByText } = render(<Home />);
  expect(getByText(/Get started/i)).toBeInTheDocument();
});