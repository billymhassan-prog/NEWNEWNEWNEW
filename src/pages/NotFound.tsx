import { useStyletron } from "baseui";
import { Button } from "baseui/button";
import { HeadingXLarge, ParagraphMedium } from "baseui/typography";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const [css, theme] = useStyletron();
  const navigate = useNavigate();

  return (
    <div
      className={css({
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.backgroundPrimary,
        padding: theme.sizing.scale800,
      })}
    >
      <div
        className={css({
          textAlign: "center",
          maxWidth: "400px",
        })}
      >
        <HeadingXLarge marginBottom={theme.sizing.scale600}>404</HeadingXLarge>
        <ParagraphMedium
          color={theme.colors.contentSecondary}
          marginBottom={theme.sizing.scale800}
        >
          Page not found
        </ParagraphMedium>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    </div>
  );
};

export default NotFound;
