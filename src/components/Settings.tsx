"use client"
// Import necessary libraries and components
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/app/_trpc/client";
import MaxWidthWrapper from "./MaxWidthWrapper";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/Avatar";
import { useToast } from "./ui/use-toast";

interface User {
  given_name: string | null;
  family_name: string | null;
  email: string | null;
  id: string | null;
}

interface SettingsProps {
  user: User;
}

interface ConfirmationDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const capitalizeFirstLetter = (str: string | null) => {
  return str ? str.charAt(0).toUpperCase() : "";
};

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, onCancel, onConfirm }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="mt-6">
      <p className="font-semibold">
        Are you sure you want to delete your account? All files and messages will be lost and cannot be retrieved again.
      </p>
      <div className="mt-4 space-x-2">
        <button
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
          onClick={onConfirm}
        >
          Yes, I am sure!
        </button>
      </div>
    </div>
  );
};

const UserProfile:React.FC<SettingsProps> = ({ user }) => {
  return (
    <div className="flex flex-col">
      <div className="flex justify-between mb-4">
        <div className="font-bold pr-4">Profile Picture:</div>
        <div>
          <Avatar>
            <AvatarImage src="" />
            {/* <AvatarImage src="https://github.com/shadcn.png" /> */}
            <AvatarFallback>
              {capitalizeFirstLetter(user.given_name)}
              {capitalizeFirstLetter(user.family_name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      <div className="flex justify-between mb-4">
        <div className="font-bold pr-4">Username:</div>
        <div>{user.given_name} {user.family_name}</div>
      </div>
      <div className="flex justify-between">
        <div className="font-bold pr-4">Email:</div>
        <div>{user.email}</div>
      </div>
    </div>
  );
};

const DangerZone = () => {
  return (
    <div className="mt-10 text-red-600 font-bold">DANGER ZONE</div>
  );
};

const Settings = ({ user }: SettingsProps) => {
  const { toast } = useToast();
  const router = useRouter();
  const [isConfirmationOpen, setConfirmationOpen] = useState(false);

  const { mutate: deleteUser } = trpc.deleteUser.useMutation({
    onSuccess: () => {
      // Informs user that his data has been deleted
      toast({
        title: "Request successful.",
        description: "User and all data have been deleted.",
      });

      const logout = `https://torpedochat.kinde.com/logout`;
      router.push(logout);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "The user could not be deleted...",
      });
    },
  });

  const handleDeleteAccountClick = () => {
    setConfirmationOpen(true);
  };

  const handleCancelClick = () => {
    setConfirmationOpen(false);
  };

  const handleYesClick = () => {
    // Call the deleteUser mutation
    deleteUser();

    // Close the confirmation dialog
    setConfirmationOpen(false);
  };

  return (
    <MaxWidthWrapper className="mb-8 mt-24 text-center max-w-5xl">
      <div className="mx-auto mb-10 sm:max-w-lg">
        <div className="rounded-2xl bg-white shadow-lg mx-auto p-5">
          <UserProfile user={user} />

          <DangerZone />

          {/* Delete account button */}
          <button
            className="mt-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
            onClick={handleDeleteAccountClick}
          >
            Delete Account
          </button>

          {/* Confirmation dialog */}
          <ConfirmationDialog
            isOpen={isConfirmationOpen}
            onCancel={handleCancelClick}
            onConfirm={handleYesClick}
          />
        </div>
      </div>
    </MaxWidthWrapper>
  );
};

export default Settings;