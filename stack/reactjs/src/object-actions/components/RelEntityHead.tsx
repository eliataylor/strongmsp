import { Typography } from "@mui/material";
import Avatar from "@mui/material/Avatar";
import CardHeader, { CardHeaderProps } from "@mui/material/CardHeader";
import React from "react";
import { Link } from "react-router-dom";
import { NAVITEMS, RelEntity } from "../types/types";

interface RelEntityHeadProps {
  rel: RelEntity;
  label?: string;
}

const RelEntityHead: React.FC<RelEntityHeadProps> = ({ rel, label }) => {
  const headerProps: Partial<CardHeaderProps> = {};
  if (rel.img) {
    headerProps.avatar = (
      <Avatar variant={"rounded"} src={rel.img} alt={rel.str} />
    );
  }

  const hasUrl = NAVITEMS.find((nav) => nav.type === rel["_type"]);

  headerProps.subheader = (
    <Typography variant={"body2"}>
      {label ? label : !hasUrl ? rel["_type"] : hasUrl.singular}{" "}
    </Typography>
  );
  headerProps.title = (
    <Typography variant={"body1"}>
      {!hasUrl ? (
        rel.str
      ) : (
        <Link to={`/${hasUrl.segment}/${rel.id}`}>{rel.str}</Link>
      )}
    </Typography>
  );

  return <CardHeader sx={{ p: 0 }} {...headerProps} />;
};

export default RelEntityHead;
