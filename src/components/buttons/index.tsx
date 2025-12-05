// Access-controlled button wrappers that hide when user lacks permission
import React from "react";
import {
  EditButton as RefineEditButton,
  DeleteButton as RefineDeleteButton,
  CreateButton as RefineCreateButton,
  Show as RefineShow,
  List as RefineList,
  type EditButtonProps,
  type DeleteButtonProps,
  type CreateButtonProps,
  type ShowProps,
  type ListProps,
} from "@refinedev/antd";
import { useCan, useParsed } from "@refinedev/core";

const accessControlConfig = { enabled: true, hideIfUnauthorized: true };

export const EditButton = (props: EditButtonProps) => (
  <RefineEditButton accessControl={accessControlConfig} {...props} />
);

export const DeleteButton = (props: DeleteButtonProps) => (
  <RefineDeleteButton accessControl={accessControlConfig} {...props} />
);

export const CreateButton = (props: CreateButtonProps) => (
  <RefineCreateButton accessControl={accessControlConfig} {...props} />
);

// Show component that respects access control for edit/delete buttons
export const Show = ({ children, ...props }: ShowProps & { children?: React.ReactNode }) => {
  const { resource } = useParsed();
  const resourceName = props.resource || resource?.name;

  const { data: canEdit } = useCan({ resource: resourceName, action: "edit" });
  const { data: canDelete } = useCan({ resource: resourceName, action: "delete" });

  return (
    <RefineShow
      {...props}
      canEdit={canEdit?.can}
      canDelete={canDelete?.can}
    >
      {children}
    </RefineShow>
  );
};

// List component that respects access control for create button
export const List = ({ children, ...props }: ListProps & { children?: React.ReactNode }) => {
  const { resource } = useParsed();
  const resourceName = props.resource || resource?.name;

  const { data: canCreate } = useCan({ resource: resourceName, action: "create" });

  return (
    <RefineList
      {...props}
      canCreate={canCreate?.can}
    >
      {children}
    </RefineList>
  );
};
