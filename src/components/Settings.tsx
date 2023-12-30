"use client";

import { useState } from "react";
import MaxWidthWrapper from "./MaxWidthWrapper";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/Avatar";
import { useRouter } from 'next/navigation'
import { trpc } from "@/app/_trpc/client";

interface SettingsProps {
  user: {
    given_name: string | null;
    family_name: string | null;
    email: string | null;
    id: string | null;
  };
}

const capitalizeFirstLetter = (str: string | null) => {
  return str ? str.charAt(0).toUpperCase() : "";
};

const Settings = ({ user }: SettingsProps) => {
  const router = useRouter();
  const [isConfirmationOpen, setConfirmationOpen] = useState(false);

  const { mutate: deleteUser } = trpc.deleteUser.useMutation({
    onSuccess: () => {
      // Redirect to the register page after successful deletion
      router.push("/sign-in");
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
          {/* Display user information in a table */}
          <div className="flex flex-col">
            <div className="flex justify-between mb-4">
              <div className="font-bold pr-4">Profile Picture:</div>
              <div>
                <Avatar>
                  <AvatarImage src="" />
                  {/*<AvatarImage src="https://github.com/shadcn.png" />*/}
                  <AvatarFallback>
                    {capitalizeFirstLetter(user.given_name)}
                    {capitalizeFirstLetter(user.family_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            <div className="flex justify-between mb-4">
              <div className="font-bold pr-4">Username:</div>
              <div>
                {user.given_name} {user.family_name}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="font-bold pr-4">Email:</div>
              <div>{user.email}</div>
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="mt-10 text-red-600 font-bold">DANGER ZONE</div>

          {/* Delete account button */}
          <button
            className="mt-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
            onClick={handleDeleteAccountClick}
          >
            Delete Account
          </button>

          {/* Confirmation dialog */}
          {isConfirmationOpen && (
            <div className="mt-6">
              <p>
                <span className="font-semibold">
                  Are you sure you want to delete your account?
                </span>{" "}
                All files and messages will be lost and cannot be retrieved
                again.
              </p>
              <button
                className="mt-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
                onClick={handleCancelClick}
              >
                Cancel
              </button>
              <button
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                onClick={handleYesClick}
              >
                Yes, I am sure!
              </button>
            </div>
          )}
        </div>
      </div>
    </MaxWidthWrapper>
  );
};

export default Settings;
